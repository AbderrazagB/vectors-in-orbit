FROM python:3.13.5-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV HF_HOME="/app/model_cache"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY preload_models.py .
RUN python preload_models.py

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]