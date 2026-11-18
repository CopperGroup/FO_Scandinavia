#!/usr/bin/env bash
#
# Installs the nightly database backup on the shop's server (run as root):
#
#   bash tools/backup/install.sh /path/to/the/shop/.env.local
#
# It copies the backup script to /usr/local/sbin/nordiva-backup, writes
# /etc/nordiva-backup.conf (kept as it is when it already exists) and a systemd
# timer that runs the backup every night at 23:30 Kyiv time. Running it again
# updates the script and the timer; it never touches existing backups.

set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "run this as root" >&2; exit 1; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-}"
CONF=/etc/nordiva-backup.conf

if [ ! -f "$CONF" ]; then
  [ -n "$ENV_FILE" ] || { echo "usage: bash install.sh /path/to/the/shop/.env.local" >&2; exit 1; }
  [ -r "$ENV_FILE" ] || { echo "cannot read $ENV_FILE" >&2; exit 1; }
  grep -qE '^[[:space:]]*MONGODB_URL=' "$ENV_FILE" || { echo "$ENV_FILE has no MONGODB_URL" >&2; exit 1; }
  cat > "$CONF" <<EOF
# Settings of the nightly database backup (tools/backup in the shop's repository).
ENV_FILE="$(readlink -f "$ENV_FILE")"   # the env file the shop is deployed with: the database address is read from it
BACKUP_DIR="/var/backups/nordiva"
KEEP=7                                   # backups kept: one a night is one week
EOF
  chmod 600 "$CONF"
  echo "wrote $CONF"
else
  echo "kept $CONF as it is"
fi

install -m 700 "$HERE/nordiva-backup.sh" /usr/local/sbin/nordiva-backup

cat > /etc/systemd/system/nordiva-backup.service <<'EOF'
[Unit]
Description=Backup of the Nordiva shop database
Wants=network-online.target
After=network-online.target docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/nordiva-backup
Nice=10
IOSchedulingClass=idle
TimeoutStartSec=45min
EOF

cat > /etc/systemd/system/nordiva-backup.timer <<'EOF'
[Unit]
Description=Nightly backup of the Nordiva shop database

[Timer]
# The end of the shop's day. If the server was off at that time, the backup runs when it is back.
OnCalendar=*-*-* 23:30:00 Europe/Kyiv
Persistent=true
AccuracySec=1min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now nordiva-backup.timer

# shellcheck disable=SC1090
. "$CONF"
docker pull -q "${IMAGE:-mongo:7.0}" >/dev/null && echo "mongodump image is ready"

echo
systemctl list-timers nordiva-backup.timer --no-pager | sed -n '1,3p'
echo
echo "Take a backup now:      systemctl start nordiva-backup && journalctl -u nordiva-backup -n 30 --no-pager"
echo "See the backups:        nordiva-backup --list"
