BASE="http://localhost:11432/api/v1"

TS=$(date +%s)
USERNAME="${1:-test_$TS}"
EMAIL="${2:-test_${TS}@test.com}"
PASSWORD="${3:-12345678}"

echo "→ POST /auth/register"
echo "  username: $USERNAME"
echo "  email:    $EMAIL"
echo ""

RESPONSE=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$RESPONSE"

if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
    echo ""
    echo "$RESPONSE" | jq
fi
