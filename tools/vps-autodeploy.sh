#!/usr/bin/env bash
# Pull-based deploy, run ON the VPS from cron.
#
# GitHub Actions would need an SSH key stored as a repository secret, which
# needs admin on a repository this team does not own. Instead the server pulls:
# docs/ is committed, so there is nothing to build here — just fetch and sync.
set -euo pipefail

REPO="/opt/wiut-site"
BRANCH="build/aml-pipeline"
TARGET="/var/www/wiut.boos.uz"
LOG="/var/log/wiut-deploy.log"

exec >>"$LOG" 2>&1
echo "--- $(date -Is) ---"

first_run=0
if [ ! -d "$REPO/.git" ]; then
  git clone --depth 20 --branch "$BRANCH" https://github.com/Vafoyev/WiutHackaton "$REPO"
  first_run=1
fi

cd "$REPO"
before=$(git rev-parse HEAD)
git fetch --quiet origin "$BRANCH"
git reset --quiet --hard "origin/$BRANCH"
after=$(git rev-parse HEAD)

# A fresh clone has nothing to compare against, and an empty target must be
# filled even when the commit has not moved.
if [ "$before" = "$after" ] && [ "$first_run" = "0" ] && [ -f "$TARGET/index.html" ]; then
  echo "no change ($after)"
  exit 0
fi

echo "deploying $before -> $after"
rsync -a --delete "$REPO/docs/" "$TARGET/"
chown -R www-data:www-data "$TARGET"

code=$(curl -s -o /dev/null -w '%{http_code}' https://wiut.boos.uz/)
echo "live check: $code"
[ "$code" = "200" ] || { echo "DEPLOY CHECK FAILED"; exit 1; }
echo "deployed $after"
