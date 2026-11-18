#!/usr/bin/env bash
#
# Nightly backup of the shop's database.
#
# The database lives in MongoDB Atlas; this script runs on the shop's server,
# takes a full dump with mongodump (read-only for the database) and keeps the
# newest KEEP dumps in BACKUP_DIR. Older ones are deleted, but only after a
# new dump has been written and checked: a night that fails never costs an
# old backup.
#
# It needs Docker only (mongodump runs from the official "mongo" image), and
# reads the database address from the same env file the shop is deployed with,
# so there is no second copy of the password to keep in step.
#
# Installed by tools/backup/install.sh as /usr/local/sbin/nordiva-backup and
# started every night by nordiva-backup.timer. Settings: /etc/nordiva-backup.conf.
#
#   nordiva-backup            take a backup now
#   nordiva-backup --list     show the backups that exist

set -euo pipefail
umask 077

CONF="${NORDIVA_BACKUP_CONF:-/etc/nordiva-backup.conf}"
# shellcheck disable=SC1090
[ -f "$CONF" ] && . "$CONF"

ENV_FILE="${ENV_FILE:-/root/FO_Scandinavia/.env.local}"   # the env file of the deployed shop
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nordiva}"
KEEP="${KEEP:-7}"                                          # how many dumps to keep: one a night is a week
IMAGE="${IMAGE:-mongo:7.0}"                                # where mongodump comes from
MIN_BYTES="${MIN_BYTES:-20000}"                            # a dump smaller than this is not a dump of a shop
LOCK_FILE="${LOCK_FILE:-/run/nordiva-backup.lock}"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { log "FAILED: $*" >&2; exit 1; }

list_backups() { find "$BACKUP_DIR" -maxdepth 1 -type f -name 'nordiva-*.archive.gz' 2>/dev/null | sort; }

if [ "${1:-}" = "--list" ]; then
  list_backups | while read -r file; do printf '%s  %s\n' "$(du -h "$file" | cut -f1)" "$file"; done
  exit 0
fi

case "$KEEP" in '' | *[!0-9]* | 0) fail "KEEP must be a number above 0, got \"$KEEP\"" ;; esac
command -v docker >/dev/null || fail "docker is not installed"
[ -r "$ENV_FILE" ] || fail "cannot read $ENV_FILE (set ENV_FILE in $CONF to the shop's env file)"

# Never two at once: a slow night must not overlap the next run or a manual one.
exec 9>"$LOCK_FILE"
flock -n 9 || fail "another backup is still running"

# The address of the database, as the shop itself reads it: the last MONGODB_URL line, quotes removed.
url="$(grep -E '^[[:space:]]*MONGODB_URL=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")"
[ -n "$url" ] || fail "no MONGODB_URL in $ENV_FILE"
case "$url" in mongodb://* | mongodb+srv://*) ;; *) fail "MONGODB_URL in $ENV_FILE does not look like a MongoDB address" ;; esac

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
# Leftovers of a run that was cut short.
find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.partial' -delete

name="nordiva-$(date '+%Y-%m-%d_%H%M%S').archive.gz"
target="$BACKUP_DIR/$name"
partial="$target.partial"

log "backup started -> $target"

# The address goes in through the environment and a config file inside the
# container, never on a command line, so it does not show up in the process list.
MONGODB_URL="$url" docker run --rm --network host -e MONGODB_URL -v "$BACKUP_DIR:/backup" "$IMAGE" sh -c '
  umask 077
  printf "uri: \047%s\047\n" "$MONGODB_URL" > /tmp/dump.yaml
  exec mongodump --config /tmp/dump.yaml --gzip --archive="/backup/'"$name"'.partial"
' 2>&1 | sed -e 's/^/  /' || { rm -f "$partial"; fail "mongodump did not finish"; }

[ -s "$partial" ] || fail "mongodump wrote nothing"
size="$(wc -c < "$partial" | tr -d ' ')"
if [ "$size" -lt "$MIN_BYTES" ]; then rm -f "$partial"; fail "the dump is only $size bytes: too small to be the shop's database"; fi
gzip -t "$partial" || { rm -f "$partial"; fail "the dump is damaged (gzip check failed)"; }

chmod 600 "$partial"
mv "$partial" "$target"
log "backup written: $name, $size bytes"

# Keep the newest KEEP dumps (the names sort by date); delete the rest.
total="$(list_backups | wc -l | tr -d ' ')"
if [ "$total" -gt "$KEEP" ]; then
  list_backups | head -n "$((total - KEEP))" | while read -r old; do
    rm -f "$old"
    log "removed old backup: $(basename "$old")"
  done
fi

printf '%s %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$name" "$size" > "$BACKUP_DIR/last-success"
log "done: $(list_backups | wc -l | tr -d ' ') backup(s) kept in $BACKUP_DIR"
