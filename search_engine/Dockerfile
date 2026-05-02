# search_engine/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 1. Copy Shared Helpers from Root
COPY id_helpers.py .
COPY kafka_broker.py .

# 2. Install Dependencies
COPY search_engine/requirements.txt ./search_engine/
RUN pip install --no-cache-dir -r search_engine/requirements.txt

# 3. Download Spacy Model
RUN python -m spacy download en_core_web_sm

# 4. Copy Source Code
COPY search_engine/ ./search_engine/

# 5. Set Path
ENV PYTHONPATH=/app

# 6. Run
CMD ["uvicorn", "search_engine.server:app", "--host", "0.0.0.0", "--port", "8002"]