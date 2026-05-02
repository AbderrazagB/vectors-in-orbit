FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY id_helpers.py .
COPY kafka_broker.py .
COPY .env .

COPY product_vectorizer/requirements.txt ./product_vectorizer/
RUN pip install --no-cache-dir -r product_vectorizer/requirements.txt

COPY product_vectorizer/ ./product_vectorizer/

ENV PYTHONPATH=/app

CMD ["python", "product_vectorizer/kafka_product_consumer.py"]