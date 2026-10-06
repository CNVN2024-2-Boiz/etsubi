echo "Enter username:"
read username

echo "Enter email:"
read email

echo "Enter password:"
read -s password
echo

curl -i -X POST http://localhost:11432/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"$password\"}"
