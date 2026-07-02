#!/usr/bin/env bash
# ─── Look Immo — Database Restoration Guide ───────────────────────────────────
#
# This script documents the full restoration procedure.
# Run it step-by-step manually; do NOT pipe directly into bash on production.
#
# Prerequisites:
#   - aws CLI installed:  apt-get install awscli  (or use the AWS SDK equivalent)
#   - pg_restore in PATH: apt-get install postgresql-client
#   - S3 credentials available as environment variables (same as app .env)
#
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── STEP 0: Load your environment ─────────────────────────────────────────────
# Adjust path to your actual .env file on the server
export $(grep -v '^#' /var/www/look-immo-api/.env | xargs)

BUCKET="${S3_BUCKET}"
PREFIX="${BACKUP_S3_PREFIX:-db-backups/}"
DB_NAME="${BACKUP_DB_NAME:-lookimmo}"
RESTORE_FILE="restore_$(date +%Y%m%d_%H%M%S).dump"

# ── STEP 1: List available backups ────────────────────────────────────────────
echo ""
echo "📦 Available backups in s3://${BUCKET}/${PREFIX}"
echo "──────────────────────────────────────────────────────"
aws s3 ls "s3://${BUCKET}/${PREFIX}" \
  --endpoint-url "${S3_ENDPOINT:-}" \
  --recursive \
  | sort -r \
  | head -20
echo ""

# ── STEP 2: Choose the backup to restore ──────────────────────────────────────
# Copy the key from the list above and set it here:
read -p "Enter the full S3 key to restore (e.g. db-backups/lookimmo_2026-06-30_02-00-00.dump): " BACKUP_KEY

if [ -z "${BACKUP_KEY}" ]; then
  echo "❌ No key provided. Aborting."
  exit 1
fi

# ── STEP 3: Download the backup ───────────────────────────────────────────────
echo ""
echo "⬇️  Downloading s3://${BUCKET}/${BACKUP_KEY}…"
aws s3 cp "s3://${BUCKET}/${BACKUP_KEY}" "./${RESTORE_FILE}" \
  --endpoint-url "${S3_ENDPOINT:-}"
echo "✅ Downloaded to ./${RESTORE_FILE}"

# ── STEP 4: (OPTIONAL) Verify dump integrity ──────────────────────────────────
echo ""
echo "🔍 Verifying dump integrity…"
pg_restore --list "./${RESTORE_FILE}" > /dev/null && echo "✅ Dump file is valid."

# ── STEP 5: Drop and recreate the database (DESTRUCTIVE) ──────────────────────
# ⚠️  WARNING: This erases ALL current data. Only do this after confirming the
#              backup is valid and you have no other option.
echo ""
echo "⚠️  DESTRUCTIVE STEP: This will DROP the current '${DB_NAME}' database."
read -p "Type 'CONFIRM' to proceed: " CONFIRM
if [ "${CONFIRM}" != "CONFIRM" ]; then
  echo "Aborted."
  exit 0
fi

# Connect to the 'postgres' admin database to drop/create the target database
psql "${DATABASE_URL/\/${DB_NAME}/\/postgres}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';"
psql "${DATABASE_URL/\/${DB_NAME}/\/postgres}" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql "${DATABASE_URL/\/${DB_NAME}/\/postgres}" -c "CREATE DATABASE ${DB_NAME};"
echo "✅ Database recreated."

# ── STEP 6: Restore ───────────────────────────────────────────────────────────
echo ""
echo "♻️  Restoring from dump…"
pg_restore \
  --no-acl \
  --no-owner \
  --dbname="${DATABASE_URL}" \
  --verbose \
  "./${RESTORE_FILE}"
echo ""
echo "✅ Restoration complete."

# ── STEP 7: Cleanup ───────────────────────────────────────────────────────────
rm -f "./${RESTORE_FILE}"
echo "🧹 Temp file cleaned up."
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Restoration finished. Restart the API server now:"
echo "  pm2 restart look-immo-api"
echo "═══════════════════════════════════════════════════════"
