"""
Vercel serverless function entry point.

This file exposes the FastAPI app to Vercel's Python runtime.
"""

import sys
from pathlib import Path

# Add backend to Python path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Import the FastAPI app
from app.main import app

# Vercel expects the app to be named 'app' or 'handler'
# FastAPI apps work directly with Vercel's Python runtime
