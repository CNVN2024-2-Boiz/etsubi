TOKEN=$(jq -r .token token.json)
USER_ID=$(jq -r .user_id token.json)

echo "=== 1. Sửa chính mình (expect 200) ==="
curl -s -X PATCH "http://localhost:11432/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"hello","avatar_url":"https://..."}' | jq
echo ""

echo "=== 2. Sửa user khác (expect 403) ==="
curl -s -w "\nStatus: %{http_code}\n" -X PATCH http://localhost:11432/api/v1/users/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"hacked"}'
echo ""

echo "=== 3. Đổi status (expect 403) ==="
curl -s -w "\nStatus: %{http_code}\n" -X PATCH http://localhost:11432/api/v1/users/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"banned"}'
echo ""
