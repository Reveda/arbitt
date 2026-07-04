#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-10}"
DB_NAME="${MONGO_DATABASE:-arbitrum}"

if [ -z "${MONGODB_URI:-}" ]; then
  echo "MONGODB_URI is required for MongoDB backups." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

run_backup() {
  timestamp="$(date -u +%Y-%m-%d_%H-%M-%S)"
  archive_path="$BACKUP_DIR/${DB_NAME}_backup_${timestamp}.archive.gz"

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting MongoDB backup: $archive_path"
  mongodump --uri="$MONGODB_URI" --archive="$archive_path" --gzip
  find "$BACKUP_DIR" -type f -name "${DB_NAME}_backup_*.archive.gz" -mtime "+$BACKUP_RETENTION_DAYS" -delete
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] MongoDB backup completed."
}

while true; do
  if run_backup; then
    sleep "$BACKUP_INTERVAL_SECONDS"
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] MongoDB backup failed. Retrying in 60 seconds." >&2
    sleep 60
  fi
done
