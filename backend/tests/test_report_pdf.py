"""
FAKENIX 2.0 — Forensic report PDF tests

Isolated app (in-memory database, temporary upload/report folders), synthetic
records and files. No network calls.
"""
import hashlib
import io
import json
import os
import shutil
import tempfile

import pytest

from app import create_app
from app.extensions import db as _db
from app.models.detection import Detection
from app.models.evidence import Evidence
from app.models.report import Report
from app.services import report_service


@pytest.fixture(scope='module')
def rapp():
    flask_app = create_app('testing')
    storage = tempfile.mkdtemp(prefix='fakenix_report_tests_')
    flask_app.config.update(UPLOAD_FOLDER=os.path.join(storage, 'uploads'),
                            REPORT_FOLDER=os.path.join(storage, 'reports'))
    os.makedirs(flask_app.config['UPLOAD_FOLDER'])
    os.makedirs(flask_app.config['REPORT_FOLDER'])
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()
    shutil.rmtree(storage, ignore_errors=True)


@pytest.fixture()
def rclient(rapp):
    return rapp.test_client()


def add_detection(rapp, uid, *, result='real', probability=5.0, name='photo.jpg', fmt='JPEG', is_demo=False,
                  model='qwen/test-model (Groq)', explanation='No blending seams are visible.', indicators=None,
                  with_evidence=True):
    """A stored detection, with a real synthetic image file as its evidence."""
    from PIL import Image
    det = Detection(
        detection_uid=uid, user_id=1, file_name=name, file_type='image', file_size='0.0', resolution='320x240',
        result=result, confidence=probability, deepfake_probability=probability,
        real_probability=round(100 - probability, 1), risk_level='low', model_name=model, is_demo=is_demo,
        status='complete', indicators_json=json.dumps(indicators or []), frames_json='[]',
        metadata_json=json.dumps({'format': fmt, 'mimeType': 'image/jpeg', 'width': 320, 'height': 240,
                                  'aiExplanation': explanation}),
    )
    _db.session.add(det)
    _db.session.flush()
    data = b''
    if with_evidence:
        buf = io.BytesIO()
        Image.new('RGB', (320, 240), (len(uid) * 7 % 255, 90, 160)).save(buf, format=fmt)
        data = buf.getvalue()
        stored = f'{uid}{os.path.splitext(name)[1]}'
        with open(os.path.join(rapp.config['UPLOAD_FOLDER'], stored), 'wb') as f:
            f.write(data)
        _db.session.add(Evidence(evidence_uid=f'FX-T-{uid}', detection_id=det.id, file_name=name,
                                 file_type='image', file_path=stored, sha256_hash=hashlib.sha256(data).hexdigest(),
                                 md5_hash=hashlib.md5(data).hexdigest(), integrity_status='verified'))
    _db.session.commit()
    return det, data


def make_report(client, uid):
    resp = client.post('/api/reports', json={'detectionId': uid})
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()['data']


def download(client, report_id):
    return client.get(f'/api/reports/{report_id}/download')


def pdf_text(data: bytes) -> str:
    pypdf = pytest.importorskip('pypdf', reason='pypdf is needed to read text back out of the PDF')
    reader = pypdf.PdfReader(io.BytesIO(data))
    return ' '.join(' '.join(page.extract_text() for page in reader.pages).split())


def context(rapp, uid, **kwargs):
    det, _ = add_detection(rapp, uid, **kwargs)
    report = Report(report_uid=f'FX-RPT-T-{uid}', detection_id=det.id, status='generating')
    _db.session.add(report)
    _db.session.commit()
    return report_service.build_report_context(report, det, det.evidence.first())


def iter_tables(flowables):
    from reportlab.platypus import KeepTogether, Table
    for flowable in flowables:
        if isinstance(flowable, Table):
            yield flowable
            for row in flowable._cellvalues:
                for cell in row:
                    yield from iter_tables(cell if isinstance(cell, list) else [cell])
        elif isinstance(flowable, KeepTogether):
            yield from iter_tables(flowable._content)


class TestLayout:
    def test_tables_fit_the_page_and_every_cell_wraps(self, rapp):
        from reportlab.platypus import Flowable
        ctx = context(rapp, 'det_layout_1', indicators=[{'name': 'Seam', 'score': 0.9, 'severity': 'high'}])
        width = 480.0
        tables = list(iter_tables(report_service.build_story(ctx, width)))
        assert len(tables) >= 6
        for table in tables:
            assert all(w is not None for w in table._colWidths), 'column widths must be explicit'
            assert sum(table._colWidths) <= width + 0.01, 'table is wider than the page frame'
            for row in table._cellvalues:
                assert len(row) == len(table._colWidths), 'more cells than column widths (the original clipping bug)'
                for cell in row:
                    assert cell == '' or isinstance(cell, (Flowable, list)), f'cell would not wrap: {cell!r}'

    def test_text_stays_inside_the_margins_even_with_very_long_values(self, rapp, rclient):
        pypdf = pytest.importorskip('pypdf')
        from reportlab.pdfbase.pdfmetrics import stringWidth
        long_text = 'A very long observation sentence that has to wrap across the page. ' * 40
        add_detection(rapp, 'det_layout_long', name='evidence_' + 'x' * 150 + '.jpg', explanation=long_text,
                      model='namespace/' + 'extremely-long-model-identifier-' * 6 + ' (Groq)',
                      indicators=[{'name': 'Indicator ' * 30, 'score': 0.5, 'severity': 'medium',
                                   'evidence': 'unbroken' * 50}])
        data = download(rclient, make_report(rclient, 'det_layout_long')['reportId']).data
        left, right = 18 * 72 / 25.4, 595.28 - 18 * 72 / 25.4
        reader = pypdf.PdfReader(io.BytesIO(data))
        for number, page in enumerate(reader.pages, start=1):
            def visit(text, cm, tm, font_dict, font_size, number=number):
                if not text.strip() or not font_dict:
                    return
                x0 = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
                font = str(font_dict.get('/BaseFont', '/Helvetica')).lstrip('/')
                x1 = x0 + stringWidth(text.rstrip(), font, font_size)
                assert x0 >= left - 0.5 and x1 <= right + 0.5, f'page {number}: text outside margins: {text[:40]!r}'
            page.extract_text(visitor_text=visit)
            assert f'Page {number} of {len(reader.pages)}' in ' '.join(page.extract_text().split())
        assert long_text.replace(' ', '') in pdf_text(data).replace(' ', ''), 'observations must not be truncated'


class TestContent:
    def test_probabilities_are_mapped_to_the_right_labels(self, rapp, rclient):
        ctx = context(rapp, 'det_map_real', result='real', probability=5.0)
        assert (ctx['verdict'], ctx['deepfake_probability'], ctx['authentic_probability']) == ('REAL', 5.0, 95.0)
        add_detection(rapp, 'det_map_fake', result='deepfake', probability=91.5)
        text = pdf_text(download(rclient, make_report(rclient, 'det_map_fake')['reportId']).data)
        assert 'VERDICT: FAKE' in text
        assert 'Deepfake Probability 91.5%' in text and 'Authentic Probability 8.5%' in text
        assert 'Confidence' not in text

    def test_report_shows_only_what_is_stored(self, rapp, rclient):
        det, data = add_detection(rapp, 'det_content_1', explanation='The jawline shows no seam.')
        report = make_report(rclient, 'det_content_1')
        assert report['evidenceId'] == 'FX-T-det_content_1' and report['detectionId'] == 'det_content_1'
        text = pdf_text(download(rclient, report['reportId']).data)
        assert report['reportId'] in text and report['evidenceId'] in text
        assert hashlib.sha256(data).hexdigest() in text.replace(' ', '')
        assert f'({len(data):,} bytes)' in text
        assert 'The jawline shows no seam.' in text
        assert 'AI Model qwen/test-model' in text and 'Inference Provider Groq Cloud' in text
        assert 'The model reported no specific manipulation indicators' in text
        for section in ('Report Information', 'Detection Result', 'File Information', 'Cryptographic Integrity',
                        'Metadata Analysis', 'Forensic Analysis', 'AI Inference Analysis', 'Observations & Findings',
                        'Legal Disclaimer'):
            assert section in text
        for invented in ('Face Detection', 'Lighting Uniformity', 'Facial Texture', 'tamper-evident',
                         'Certificate of Authenticity', 'No synthetic manipulation detected', 'FAKENIX Deep Learning'):
            assert invented not in text

    def test_format_comes_from_the_file_not_the_name(self, rapp):
        ctx = context(rapp, 'det_fmt_1', name='Alumini.png', fmt='JPEG')
        assert ctx['metadata']['format'] == 'JPEG' and ctx['metadata']['mime'] == 'image/jpeg'
        assert any('".png" indicates PNG' in issue for issue in ctx['metadata']['inconsistencies'])
        ctx = context(rapp, 'det_fmt_2', name='Alumini.png', fmt='PNG')
        assert ctx['metadata']['format'] == 'PNG' and ctx['metadata']['mime'] == 'image/png'
        assert ctx['metadata']['inconsistencies'] == []

    def test_demo_result_is_labelled(self, rapp, rclient):
        add_detection(rapp, 'det_demo_x', is_demo=True, model='DEMO ANALYSIS (simulated)',
                      explanation='must not be shown as model output')
        text = pdf_text(download(rclient, make_report(rclient, 'det_demo_x')['reportId']).data)
        assert 'DEMO / SIMULATED ANALYSIS' in text and 'no model inference was run' in text
        assert 'must not be shown as model output' not in text and 'Groq' not in text


class TestIntegrity:
    def test_match_mismatch_and_missing(self, rapp):
        det, _ = add_detection(rapp, 'det_int_1')
        evidence = det.evidence.first()
        assert report_service.check_evidence_integrity(evidence)['state'] == 'match'

        path = os.path.join(rapp.config['UPLOAD_FOLDER'], evidence.file_path)
        with open(path, 'ab') as f:
            f.write(b'tampered')
        result = report_service.check_evidence_integrity(evidence)
        assert result['state'] == 'mismatch' and result['actual_sha256'] != evidence.sha256_hash

        os.remove(path)
        assert report_service.check_evidence_integrity(evidence)['state'] == 'unavailable'
        assert report_service.check_evidence_integrity(None)['state'] == 'no_evidence'

    def test_no_evidence_means_no_invented_hash(self, rapp, rclient):
        add_detection(rapp, 'det_int_none', with_evidence=False)
        before = Evidence.query.count()
        resp = download(rclient, make_report(rclient, 'det_int_none')['reportId'])
        assert resp.status_code == 200 and resp.data[:5] == b'%PDF-'
        assert Evidence.query.count() == before


class TestReportRecords:
    def counts(self):
        return Detection.query.count(), Evidence.query.count(), Report.query.count()

    def test_ids_are_unique_and_repeat_requests_reuse_the_report(self, rapp, rclient):
        add_detection(rapp, 'det_id_a')
        add_detection(rapp, 'det_id_b')
        a, b = make_report(rclient, 'det_id_a'), make_report(rclient, 'det_id_b')
        assert a['reportId'] != b['reportId']
        assert (a['detectionId'], b['detectionId']) == ('det_id_a', 'det_id_b')
        assert make_report(rclient, 'det_id_a')['reportId'] == a['reportId']

    def test_download_is_a_stable_pdf_and_creates_nothing(self, rapp, rclient):
        add_detection(rapp, 'det_dl_1')
        report = make_report(rclient, 'det_dl_1')
        before = self.counts()
        first, second = download(rclient, report['reportId']), download(rclient, report['reportId'])
        assert first.status_code == 200 and first.mimetype == 'application/pdf'
        assert first.data.startswith(b'%PDF-') and first.data == second.data
        assert f'{report["reportId"]}.pdf' in first.headers['Content-Disposition']
        assert self.counts() == before

    def test_unknown_ids_are_errors_and_create_nothing(self, rapp, rclient):
        before = self.counts()
        files = sorted(os.listdir(rapp.config['REPORT_FOLDER']))
        assert download(rclient, 'FX-RPT-2026-999999').status_code == 404
        assert download(rclient, 'not-a-report').status_code == 404
        assert rclient.post('/api/reports', json={'detectionId': 'det_missing'}).status_code == 400
        assert self.counts() == before, 'no fabricated detection, evidence or report'
        assert sorted(os.listdir(rapp.config['REPORT_FOLDER'])) == files
        assert rclient.get('/api/reports').status_code == 200 and self.counts() == before, 'no seeded samples'

    def test_old_layout_pdf_is_rebuilt_without_overwriting_it(self, rapp, rclient):
        add_detection(rapp, 'det_old_1')
        report = make_report(rclient, 'det_old_1')
        row = Report.query.filter_by(report_uid=report['reportId']).one()
        old_name = f'{report["reportId"].replace("-", "_")}.pdf'
        old_path = os.path.join(rapp.config['REPORT_FOLDER'], old_name)
        with open(old_path, 'wb') as f:
            f.write(b'%PDF-1.4 old clipped layout')
        row.report_path = old_name
        _db.session.commit()

        resp = download(rclient, report['reportId'])
        _db.session.refresh(row)
        assert resp.status_code == 200 and resp.data != b'%PDF-1.4 old clipped layout'
        assert row.report_uid == report['reportId'] and row.report_path != old_name
        with open(old_path, 'rb') as f:
            assert f.read() == b'%PDF-1.4 old clipped layout'

    def test_report_number_is_not_reissued_after_deletion(self, rapp, rclient):
        add_detection(rapp, 'det_reuse_a')
        add_detection(rapp, 'det_reuse_b')
        first = make_report(rclient, 'det_reuse_a')
        _db.session.delete(Report.query.filter_by(report_uid=first['reportId']).one())
        _db.session.commit()
        second = make_report(rclient, 'det_reuse_b')
        assert int(second['reportId'].rsplit('-', 1)[1]) > int(first['reportId'].rsplit('-', 1)[1])
