#!/usr/bin/env bash
# Resizes the shop's photos ahead of visitors, one at a time, so nobody is the first to wait for them.
#
#   bash tools/image-cache/warm.sh                 # every catalog page, the sizes browsers ask for
#   WIDTHS="320 420" bash tools/image-cache/warm.sh
#
# Run it at night, after the store of resized photos was emptied (a new server, a deleted volume).
# It only asks the shop for pictures, the way a browser does, one at a time and with a pause after
# each one it had to resize. A resize takes a whole processor core, so the shop is slower for
# visitors while this runs. Photos that are already resized answer at once. Safe to stop
# (pkill -f "image-cache/[w]arm.sh") and to run again.
set -euo pipefail

SITE="${SITE:-https://nordiva.com.ua}"
# What browsers really ask for: 64 (search and cart thumbnails), 256 and 320 (cards on desktop,
# related products), 420 and 640 (cards on phones), 828 (the product page on a phone).
WIDTHS="${WIDTHS:-64 256 320 420 640 828}"
QUALITY="${QUALITY:-75}"
# Seconds to leave the processor to visitors after each photo that had to be resized.
PAUSE="${PAUSE:-0.5}"
MAX_PAGES="${MAX_PAGES:-400}"

photos=0; fetched=0; made=0; failed=0
list="$(mktemp)"
trap 'rm -f "$list"' EXIT

page=1
while [ "$page" -le "$MAX_PAGES" ]; do
  html="$(curl -fsS "$SITE/catalog?page=$page" || true)"
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
    state="$(curl -s -o /dev/null -H "Accept: image/avif,image/webp,*/*" -w '%{http_code} %header{x-nextjs-cache}' "$SITE$url&w=$width&q=$QUALITY" || echo "000 -")"
    fetched=$((fetched + 1))
    case "$state" in
      "200 MISS") made=$((made + 1)); sleep "$PAUSE" ;;
      200*) ;;
      *) failed=$((failed + 1)) ;;
    esac
  done
  photos=$((photos + 1))
  if [ $((photos % 100)) -eq 0 ]; then echo "  $photos photos: $fetched sizes asked, $made resized now, $failed failed"; fi
done < "$list"

echo "done: $photos photos, $fetched sizes asked, $made resized now, $failed failed"
