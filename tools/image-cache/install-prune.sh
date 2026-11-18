#!/usr/bin/env bash
# Installs a weekly clean-up of the resized photos the shop keeps (the Docker volume mounted at
# /app/.next/cache/images). The app never deletes a resized photo by itself, so without this the
# volume only grows. A copy that was not made or refreshed for 60 days belongs to a photo nobody
# opens any more; if someone does, it is simply resized again.
#
#   bash tools/image-cache/install-prune.sh            # once, on the server, as root
#   systemctl start nordiva-image-prune                # run it now
#   journalctl -u nordiva-image-prune -n 20 --no-pager # what it did
set -euo pipefail

VOLUME="${VOLUME:-fo_scandinavia_next_images}"
KEEP_DAYS="${KEEP_DAYS:-60}"

cat > /usr/local/sbin/nordiva-image-prune <<SCRIPT
#!/usr/bin/env bash
set -euo pipefail
dir="\$(docker volume inspect --format '{{ .Mountpoint }}' "$VOLUME")"
case "\$dir" in /var/lib/docker/volumes/*/_data) ;; *) echo "unexpected volume path: \$dir" >&2; exit 1 ;; esac
before="\$(du -sm "\$dir" | cut -f1)"
removed="\$(find "\$dir" -type f -mtime +$KEEP_DAYS -print -delete | wc -l)"
find "\$dir" -mindepth 1 -type d -empty -delete
echo "resized photos: \${before} MB before, \$(du -sm "\$dir" | cut -f1) MB now, \$removed files older than $KEEP_DAYS days removed"
SCRIPT
chmod 755 /usr/local/sbin/nordiva-image-prune

cat > /etc/systemd/system/nordiva-image-prune.service <<UNIT
[Unit]
Description=Remove resized shop photos nobody asked for in $KEEP_DAYS days

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/nordiva-image-prune
UNIT

cat > /etc/systemd/system/nordiva-image-prune.timer <<UNIT
[Unit]
Description=Weekly clean-up of resized shop photos

[Timer]
OnCalendar=Sun *-*-* 04:30:00 Europe/Kyiv
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now nordiva-image-prune.timer
systemctl list-timers nordiva-image-prune.timer --no-pager
