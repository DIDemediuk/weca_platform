#!/usr/bin/env bash
# Smoke-test the running WestCamp Gardner server.
# Usage: FORM_SECRET=x ADMIN_SECRET=y BASE=http://localhost:4747 bash smoke.sh
set -e

BASE="${BASE:-http://localhost:4747}"
FS="${FORM_SECRET:-smoke}"
AS="${ADMIN_SECRET:-adm}"

ok() { echo "  OK  $1"; }
fail() { echo "FAIL  $1"; exit 1; }

check() {
  local label=$1 url=$2 want=$3
  local got
  got=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  [ "$got" = "$want" ] && ok "$label ($got)" || fail "$label (got $got, want $want)"
}

echo "=== WestCamp Gardner smoke ==="
check "health"                  "$BASE/health"            200
check "form (right secret)"     "$BASE/f/$FS"             200
check "form (wrong secret)"     "$BASE/f/wrong"           404
check "admin list (right)"      "$BASE/admin/$AS"         200
check "admin content (right)"   "$BASE/admin/$AS/content" 200
check "admin (wrong secret)"    "$BASE/admin/wrong"       404
check "static CSS"              "$BASE/static/styles.css" 200

echo ""
echo "=== PDF generation (real Playwright render) ==="
mkdir -p /tmp/wc-smoke-uploads
HTTP=$(curl -s -o /tmp/wc-smoke.pdf -w "%{http_code}" \
  -X POST "$BASE/f/$FS" \
  -F "childName=Тест Іванко" \
  -F "shift=1" \
  -F "primaryType=musical" \
  -F "secondaryType=kinesthetic" \
  -F "example=Іванко яскраво проявився на третій день табору під час музичного квесту." \
  -F "photo=@$(dirname "$0")/placeholder.jpg;type=image/jpeg")
[ "$HTTP" = "200" ] || fail "form POST (got $HTTP)"
magic=$(head -c 4 /tmp/wc-smoke.pdf | xxd -p)
[ "$magic" = "25504446" ] && ok "PDF magic bytes (%PDF)" || fail "not a PDF (got $magic)"

size=$(wc -c < /tmp/wc-smoke.pdf)
echo "  PDF size: ${size} bytes"

echo ""
echo "=== Admin report re-download ==="
REPORT_PATH=$(curl -s "$BASE/admin/$AS" | grep -o 'report/[^"]*\.pdf' | head -1)
if [ -z "$REPORT_PATH" ]; then
  echo "  SKIP  No reports in DB yet (in-memory DB — run form POST first)"
else
  HTTP2=$(curl -s -o /tmp/wc-admin.pdf -w "%{http_code}" "$BASE/admin/$AS/$REPORT_PATH")
  [ "$HTTP2" = "200" ] && ok "admin PDF re-download ($REPORT_PATH)" || fail "admin PDF (got $HTTP2)"
fi

echo ""
echo "All checks passed."
