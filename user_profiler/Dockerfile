# 1. Use Python 3.13 (Slim)
FROM python:3.13.5-slim

WORKDIR /app

# 2. Environment Variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# 3. System Dependencies (if needed for kafka)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy Shared Utilities
COPY id_helpers.py .
COPY kafka_broker.py .
COPY .env .

# 5. Install Dependencies
COPY user_profiler/requirements.txt ./user_profiler/
RUN pip install --no-cache-dir -r user_profiler/requirements.txt

# 6. Copy Agent Code
COPY user_profiler/ ./user_profiler/

# 7. Run Consumer
CMD ["python", "user_profiler/kafka_consumer.py"]