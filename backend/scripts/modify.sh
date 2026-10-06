echo "Enter user id:"
read user_id

echo "Enter JSON:"
read json

curl -X PATCH "http://localhost:11432/api/v1/users/$user_id" \
  -H "Authorization: Bearer $(jq -r .token token.json)" \
  -H "Content-Type: application/json" \
  -d "$json" | jq
