#!/bin/sh
# entrypoint.sh — Hydrate MongoDB from Qdrant, then start the API server.

echo "[entrypoint] Running MongoDB user hydration from Qdrant..."
python -m mongo_backend.populate_users_from_qdrant

echo "[entrypoint] Starting API server..."
exec uvicorn mongo_backend.api_server:app --host 0.0.0.0 --port 8000
