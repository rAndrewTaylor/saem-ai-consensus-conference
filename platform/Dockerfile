FROM node:20-slim AS frontend

WORKDIR /build
COPY frontend-react/package.json frontend-react/package-lock.json* ./
RUN npm install --production=false
COPY frontend-react/ ./
RUN npm run build

# ---

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Copy React build from frontend stage
COPY --from=frontend /build/dist ./frontend-react/dist

RUN mkdir -p /app/data

EXPOSE 8000

# Railway sets PORT env var; fall back to 8000
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
