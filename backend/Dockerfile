FROM python:3.12-slim

# ── Install Node.js 22 ────────────────────────────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Node.js dependencies (parse-save-json.js parser) ─────────────────────────
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Python dependencies ───────────────────────────────────────────────────────
COPY backend/ ./backend/
RUN pip install --no-cache-dir "./backend[dev]"

# ── Application source ────────────────────────────────────────────────────────
COPY scripts/ ./scripts/

WORKDIR /app/backend

# ── Entrypoint: migrate then serve ───────────────────────────────────────────
CMD ["sh", "-c", "alembic upgrade head && uvicorn sat_backend.main:app --host 0.0.0.0 --port 8000 --reload"]
