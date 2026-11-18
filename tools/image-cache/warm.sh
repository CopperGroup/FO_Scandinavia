#!/usr/bin/env bash
# Resizes the shop's photos ahead of visitors, one at a time, so nobody is the first to wait for them.
#
#   bash tools/image-cache/warm.sh                 # every catalog page, the usual phone and desktop widths
#   WIDTHS="320 420" bash tools/image-cache/warm.sh
#
# Run it on the server after the store of resized photos was emptied (a new server, a deleted
# volume). It only asks the running app for pictures, the way a browser does; photos that are
# already resized answer at once. Safe to stop and to run again.
set -euo pipefail

APP="${APP:-http://127.0.0.1:3000}"
HOST_HEADER="${HOST_HEADER:-nordiva.com.ua}"
# Widths the catalog cards are really asked for: phones (420, 640) and desktop cards (320, 640).
WIDTHS="${WIDTHS:-320 420 640}"
QUALITY="${QUALITY:-75}"
MAX_PAGES="${MAX_PAGES:-400}"

photos=0; fetched=0; made=0; failed=0
list="$(mktemp)"
trap 'rm -f "$list"' EXIT

page=1
while [ "$page" -le "$MAX_PAGES" ]; do
  html="$(curl -fsS -H "Host: $HOST_HEADER" "$APP/catalog?page=$page" || true)"
  found="$(printf '%s' "$html" | grep -oE '/_next/image\?url=[^"&; ]+' | sort -u || true)"
  [ -n "$found" ] || break
  # The last page repeats when the number runs past the end: stop when nothing new shows up.
  new="$(printf '%s\n' "$found" | grep -vxFf "$list" || true)"
  [ -n "$new" ] || break
  printf '%s\n' "$new" >> "$list"
  page=$((page + 1))
done
echo "photos found on $((page - 1)) catalog pages: $(wc -l < "$list")"

while IFS= read -r url; do
  for width in $WIDTHS; do
    state="$(curl -s -o /dev/null -H "Host: $HOST_HEADER" -H "Accept: image/avif,image/webp,*/*" -w '%{http_code} %header{x-nextjs-cache}' "$APP$url&w=$width&q=$QUALITY" || echo "000 -")"
    fetched=$((fetched + 1))
    case "$state" in
      "200 MISS") made=$((made + 1)) ;;
      200*) ;;
      *) failed=$((failed + 1)) ;;
    esac
  done
  photos=$((photos + 1))
  if [ $((photos % 100)) -eq 0 ]; then echo "  $photos photos: $fetched sizes asked, $made resized now, $failed failed"; fi
done < "$list"

echo "done: $photos photos, $fetched sizes asked, $made resized now, $failed failed"
