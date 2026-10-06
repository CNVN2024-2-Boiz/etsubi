echo "Enter email:"
read email

echo "Enter password:"
read -s password
echo

curl -s -X POST http://localhost:11432/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
  > token.json

cat token.json | jq
