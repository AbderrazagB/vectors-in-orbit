#!/bin/sh
# init_qdrant.sh — Extract Qdrant storage dump into the data volume.
# Idempotent: skips extraction if collections already exist.

DATA_DIR="/qdrant_data"
ZIP_FILE="/dump/qdrant_storage_dump.zip"

if [ -d "$DATA_DIR/collections" ] && [ "$(ls -A $DATA_DIR/collections 2>/dev/null)" ]; then
    echo "[init_qdrant] Collections already exist in $DATA_DIR/collections — skipping extraction."
    exit 0
fi

echo "[init_qdrant] No existing collections found. Extracting $ZIP_FILE ..."

if [ ! -f "$ZIP_FILE" ]; then
    echo "[init_qdrant] ERROR: $ZIP_FILE not found!"
    exit 1
fi

# The zip contains qdrant_data/ at the root, so we strip the first component
# and extract directly into $DATA_DIR
unzip -o "$ZIP_FILE" -d /tmp/qdrant_extract

# Move contents from extracted qdrant_data/ into the volume mount
cp -a /tmp/qdrant_extract/qdrant_data/. "$DATA_DIR/"
rm -rf /tmp/qdrant_extract

echo "[init_qdrant] Extraction complete. Collections:"
ls "$DATA_DIR/collections/"
