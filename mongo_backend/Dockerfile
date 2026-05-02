# Use official Python image
FROM python:3.13.5-slim


ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app


ENV PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY mongo_backend/api_requirements.txt ./
RUN pip install --no-cache-dir -r api_requirements.txt

# Copy the rest of the application code
COPY /mongo_backend  ./mongo_backend/

# Make entrypoint executable
RUN chmod +x ./mongo_backend/entrypoint.sh

# Expose the API port (default FastAPI/uvicorn port)
EXPOSE 8000

# Set environment variables (optional, can be overridden)


# Run entrypoint: hydrate MongoDB from Qdrant, then start API server
CMD ["./mongo_backend/entrypoint.sh"]
