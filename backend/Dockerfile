FROM python:3.14-slim AS deps

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
RUN pip install --no-cache-dir "./backend"

# ── Builder: copy application source ─────────────────────────────────────────
FROM deps AS builder

COPY scripts/ ./scripts/

# ── Production: hardened image ───────────────────────────────────────────────
FROM python:3.14-slim AS production

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/package.json ./package.json

RUN chown -R appuser:appuser /app
USER appuser

WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# ── Entrypoint: migrate then serve ───────────────────────────────────────────
CMD ["sh", "-c", "alembic upgrade head && uvicorn sat_backend.main:app --host 0.0.0.0 --port 8000"]

# ── Dev: production image + test/lint/debug tooling ──────────────────────────
FROM production AS dev

USER root

WORKDIR /app/backend

# Editable install with dev extras (pytest, pytest-asyncio, pytest-cov, ruff)
# so the mounted source is testable/lintable in place. Installed as root; the
# container runs tooling as the unprivileged appuser.
RUN pip install --no-cache-dir -e ".[dev]"

USER appuser

CMD ["pytest", "-q"]
