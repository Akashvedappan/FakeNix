"""
FAKENIX 2.0 — Flask Application Entry Point
Run with: python run.py
Or with:  flask run
"""
import os
import sys

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def _use_project_environment() -> None:
    """
    Dependencies (flask, groq, opencv, ...) are installed by uv into backend/.venv.
    A plain `python run.py` starts whatever interpreter is on PATH, which does not
    have them. If that happened, restart this script with the project's interpreter.
    """
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    venv_dir = os.path.join(backend_dir, '.venv')
    venv_python = os.path.join(venv_dir, 'Scripts', 'python.exe') if os.name == 'nt' \
        else os.path.join(venv_dir, 'bin', 'python')

    if os.path.normcase(os.path.abspath(sys.prefix)) == os.path.normcase(venv_dir):
        return
    if not os.path.exists(venv_python):
        sys.exit('The project environment backend/.venv does not exist. '
                 'Run "uv sync" in backend/, then "uv run python run.py".')

    import subprocess
    print(f'Not running in the project environment ({sys.executable}).\n'
          f'Restarting with {venv_python}\n')
    try:
        sys.exit(subprocess.call([venv_python, os.path.abspath(__file__), *sys.argv[1:]]))
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == '__main__':
    _use_project_environment()

from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    print(f"\n{'='*60}")
    print(f"  FAKENIX 2.0 Backend")
    print(f"  Running at: http://127.0.0.1:{port}")
    print(f"  Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"  Demo Mode: {os.environ.get('DEMO_MODE', 'true')}")
    print(f"{'='*60}\n")
    app.run(
        host='127.0.0.1',
        port=port,
        debug=debug,
        use_reloader=debug
    )
