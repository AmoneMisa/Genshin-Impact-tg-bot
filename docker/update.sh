#!/bin/sh
# Updates the bot to the newest image from GHCR and removes leftovers.
#
#   ./docker/update.sh                 # from the project folder, or by full path
#   crontab: 0 5 * * * /opt/bot/docker/update.sh >> /var/log/bot-update.log 2>&1
#
# What is removed:
#   - dangling images: the previous bot / mongo versions whose tag moved to the
#     newly pulled image (other projects' tagged images are left alone)
#   - anonymous volumes no container uses (e.g. Mongo's /data/configdb left
#     behind by replaced containers); Docker 23+ only, see below
# What is never removed:
#   - the database (mongo-data) and the bot state (bot-state): they are named,
#     in use by the running stack, and labelled com.genshin-bot.keep=true,
#     which the prune below always skips.
set -eu

cd "$(dirname "$0")/.."

echo "[$(date -u +%FT%TZ)] pulling images"
docker compose pull

echo "[$(date -u +%FT%TZ)] recreating changed containers"
docker compose up -d --remove-orphans

# Only clean up when the database container is running, so its volume is in
# use and cannot be considered unused even without the label.
if ! docker compose ps --status running --services | grep -qx mongo; then
  if [ -z "${DOCKER_MONGO_URL:-}" ] && ! grep -Eqs '^DOCKER_MONGO_URL=.+' .env; then
    echo "[$(date -u +%FT%TZ)] mongo is not running; skipping cleanup to be safe" >&2
    exit 1
  fi
fi

echo "[$(date -u +%FT%TZ)] removing old image versions"
docker image prune -f

# Before Docker 23, `volume prune` also deletes unused *named* volumes (other
# projects' data included), so it only runs on 23+, where it limits itself to
# anonymous volumes. Our named volumes are additionally excluded by label.
engine_major=$(docker version --format '{{.Server.Version}}' | cut -d. -f1)
if [ "${engine_major:-0}" -ge 23 ]; then
  echo "[$(date -u +%FT%TZ)] removing unused anonymous volumes (named volumes are kept)"
  docker volume prune -f --filter "label!=com.genshin-bot.keep=true"
else
  echo "[$(date -u +%FT%TZ)] Docker ${engine_major} < 23: skipping volume cleanup" >&2
fi

docker compose ps
