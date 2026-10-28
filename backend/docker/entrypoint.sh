#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set" >&2
    exit 1
fi

DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')

echo "Waiting for database at $DB_HOST:$DB_PORT (user=$DB_USER)..."
i=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
        echo "ERROR: database not ready after 60s" >&2
        exit 1
    fi
    sleep 1
done

echo "Running migrations..."
diesel migration run

if [ "$RUN_MODE" = "dev" ]; then
    echo "Starting backend in DEV mode (cargo-watch)..."
    exec cargo watch -x run
else
    echo "Starting backend..."
    exec backend
fi
