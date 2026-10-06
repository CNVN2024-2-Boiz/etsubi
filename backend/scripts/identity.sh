curl localhost:11432/api/v1/my \
      -H "Authorization: Bearer $(jq -r .token token.json)" \
      -H "Content-Type: application/json"
