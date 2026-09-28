#!/usr/bin/env bash
# Consistent backup: briefly stops ONLY ZikriLLah. Run as root.
set -euo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run as root' >&2; exit 1; }
install -d -m 700 /var/backups/zikrillah
exec 9>/var/backups/zikrillah/backup.lock
flock -n 9 || { echo 'Another backup is running' >&2; exit 1; }
test -f /var/lib/zikrillah/zikrillah.sqlite
test -f /etc/zikrillah/zikrillah.env
was_active=0
systemctl is-active --quiet zikrillah.service && was_active=1
resume() { if [[ $was_active -eq 1 ]]; then systemctl start zikrillah.service; fi; }
trap resume EXIT
systemctl stop zikrillah.service
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="/var/backups/zikrillah/$stamp.tar.gz"
test ! -e "$archive"
tar -C / -czf "$archive.partial" var/lib/zikrillah etc/zikrillah
tar -tzf "$archive.partial" >/dev/null
mv -- "$archive.partial" "$archive"
git -C /opt/zikrillah/app rev-parse HEAD >"$archive.commit"
sha256sum "$archive" >"$archive.sha256"
echo "Backup: $archive"
