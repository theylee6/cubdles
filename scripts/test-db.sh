#!/usr/bin/env bash
# Runs the database migrations and SQL tests against a fresh, throwaway database.
# Needs a Postgres 15+ server with PostGIS. Set ADMIN_DATABASE_URL to a superuser connection.
#   ADMIN_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres ./scripts/test-db.sh
set -euo pipefail

ADMIN_URL="${ADMIN_DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
DB="cubdles_test_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_URL="${ADMIN_URL%/*}/$DB"

cleanup() { psql "$ADMIN_URL" -qc "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql "$ADMIN_URL" -qc "create database $DB" >/dev/null
run() {
  psql "$TEST_URL" -q -t -A -v ON_ERROR_STOP=1 -o /dev/null -f "$1" 2>&1 \
    | sed -E -e 's/^psql:[^ ]+ NOTICE:  /  /' -e 's/^NOTICE:  /  /' \
    | { grep -vE '^\s*$|extension .* already exists|^  (relation|schema) .* already exists' || true; }
  return "${PIPESTATUS[0]}"
}

echo "→ Supabase stub"
run "$ROOT/tests/db/_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  run "$f"
done
echo "→ seed"
run "$ROOT/supabase/seed.sql"
run "$ROOT/tests/db/_helpers.sql"

status=0
for f in "$ROOT"/tests/db/[0-9]*.sql; do
  echo "→ test $(basename "$f")"
  run "$f" || status=1
done
[ $status -eq 0 ] && echo "All database tests passed." || echo "Database tests FAILED."
exit $status
