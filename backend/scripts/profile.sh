set TOKEN (jq -r .token token.json)

curl -i http://localhost:11432/api/v1/my

curl -i http://localhost:11432/api/v1/my -H "Authorization: Bearer $TOKEN"

curl -i http://localhost:11432/api/v1/users/1
