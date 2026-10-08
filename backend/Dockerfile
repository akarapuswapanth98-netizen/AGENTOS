FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /code

RUN useradd -m appuser && mkdir -p /data && chown appuser:appuser /data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./alembic.ini
COPY alembic ./alembic
COPY app ./app

# The model file is gitignored, so (re)build it inside the image.
RUN python -m app.ml.train

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

# Migrate, then serve on $PORT (platforms like Render inject PORT).
# Documented start command: sh -c "python -m alembic -c alembic.ini upgrade head && exec uvicorn ..."
CMD ["sh", "-c", "python -m alembic -c alembic.ini upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
