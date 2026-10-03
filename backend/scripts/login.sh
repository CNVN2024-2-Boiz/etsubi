BASE="http://localhost:11432/api/v1"
TOKEN_FILE="token.json"

EMAIL="${1:-}"
PASSWORD="${2:-12345678}"

if [ -z "$EMAIL" ]; then
    TS=$(date +%s)
    USERNAME="user_$TS"
    EMAIL="test_${TS}@test.com"

    echo "→ Auto register: $EMAIL"
    curl -s -X POST "$BASE/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
    echo ""
fi

echo "→ POST /auth/login"
echo "  email: $EMAIL"
echo ""

RESPONSE=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Raw: $RESPONSE"
echo ""

if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
    echo "$RESPONSE" > "$TOKEN_FILE"
    echo "$RESPONSE" | jq
    echo ""
    echo "✓ Saved to $TOKEN_FILE"
else
    echo "❌ Login failed: $RESPONSE"
    exit 1
fi
