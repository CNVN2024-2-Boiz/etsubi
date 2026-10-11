POST http://localhost:11432/api/v1/auth/register
Content-Type: application/json

{
  "username": "{{username}}",
  "email": "{{email}}",
  "password": "{{password}}"
}

HTTP 201
[Asserts]
jsonpath "$.user_id" exists


POST http://localhost:11432/api/v1/auth/login
Content-Type: application/json

{
  "email": "{{email}}",
  "password": "{{password}}"
}

HTTP 200
[Captures]
jwt: jsonpath "$.token" redact


GET http://localhost:11432/api/v1/my
Authorization: Bearer {{jwt}}

HTTP 200
[Asserts]
jsonpath "$.username" == "{{username}}"
jsonpath "$.role" exists
jsonpath "$.status" exists
