#!/usr/bin/env bash
# Publish the built EDA site to the VPS.
#
# The site is static, so it is dropped inside an existing nginx document root
# rather than given its own server block: nothing in /etc/nginx is touched, and
# the sites already running on this host cannot be affected.
#
#   docs/  ->  /var/www/boos.uz/aml/  ->  https://boos.uz/aml/
#
# Usage: tools/deploy.sh [ssh-key]
set -euo pipefail

KEY="${1:-$HOME/docean}"
HOST="root@67.205.171.93"
TARGET="/var/www/boos.uz/aml/"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/docs/index.html" ]; then
  echo "docs/ is not built. Run: cd eda-website && npm run build" >&2
  exit 1
fi

echo "Uploading $(du -sh "$ROOT/docs" | cut -f1) to $HOST:$TARGET"
ssh -i "$KEY" "$HOST" "mkdir -p $TARGET"
rsync -az --delete -e "ssh -i $KEY" "$ROOT/docs/" "$HOST:$TARGET"
ssh -i "$KEY" "$HOST" "chown -R 1001:1001 $TARGET"

echo "Verifying..."
for path in "" "video-frames/frame_1.webp"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://boos.uz/aml/$path")
  printf '  %s  /aml/%s\n' "$code" "$path"
  [ "$code" = "200" ] || { echo "deploy check failed" >&2; exit 1; }
done
echo "Live: https://boos.uz/aml/"
