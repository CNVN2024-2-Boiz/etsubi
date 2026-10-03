BASE="http://localhost:11432/api/v1"
TOKEN_FILE="token.json"

if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Không có $TOKEN_FILE — chạy login.sh trước"
    exit 1
fi

TOKEN=$(jq -r .token "$TOKEN_FILE")

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Token không hợp lệ — chạy lại login.sh"
    exit 1
fi

echo "→ GET /users/me"
echo "  token: ${TOKEN:0:30}..."
echo ""

curl -s "$BASE/users/me" \
  -H "Authorization: Bearer $TOKEN" | jq
