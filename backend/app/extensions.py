"""
FAKENIX 2.0 — Shared Flask Extensions
Instantiated here, initialized in the app factory.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
