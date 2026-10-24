#!/bin/sh
# Copy Newton Aycliffe U9s' live site (docs/ in seanlawless1989/nayfcu9) into newton-aycliffe-u9s/,
# so the team is reachable at touchlinetales.club/newton-aycliffe-u9s/ as well as its own domain.
# Same files and the same Supabase database, so it is the live site, not a copy of the data.
# Only change: links the site shares (match pages, the app link) point here instead of nayfootball.club.
# Run it after every nayfcu9 site change is merged, alongside the Darlington rebuild:
#     tools/sync_nayfc.sh ../nayfcu9
set -eu
SRC="${1:?usage: tools/sync_nayfc.sh <path to a nayfcu9 checkout>}/docs"
DEST="$(cd "$(dirname "$0")/.." && pwd)/newton-aycliffe-u9s"
URL="https://touchlinetales.club/newton-aycliffe-u9s"
[ -f "$SRC/index.html" ] || { echo "No site in $SRC" >&2; exit 1; }
# CNAME belongs to nayfootball.club; manager/ is Sean's own tool and isn't linked from the site.
rm -rf "$DEST" && cp -R "$SRC" "$DEST" && rm -rf "$DEST/CNAME" "$DEST/manager"
sed -i "s#^\(\s*siteUrl:\s*\)\"[^\"]*\"#\1\"$URL\"#" "$DEST/team.js"
grep -q "siteUrl: \"$URL\"" "$DEST/team.js" || { echo "Couldn't set siteUrl in team.js" >&2; exit 1; }
