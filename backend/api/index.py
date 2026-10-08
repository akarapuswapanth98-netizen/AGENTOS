"""Vercel serverless entrypoint: adapts the FastAPI app to the Lambda-style event.

Vercel's Python runtime invokes handler(event, context); Mangum translates
that into an ASGI scope for the app, including base64 bodies (multipart
uploads) and query strings. Lifespan runs at cold start, which executes the
same startup the Docker image runs: production config validation plus
creating tables if needed.
"""
from mangum import Mangum

from app.main import app

handler = Mangum(app, lifespan="on")
