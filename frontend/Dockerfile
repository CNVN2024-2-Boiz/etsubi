FROM docker.io/library/node:20-alpine

RUN npm install -g live-server@1.2.2

WORKDIR /app
COPY . .

ARG API_BASE=http://localhost:11432/api/v1
RUN sed -i "s|http://localhost:11432/api/v1|${API_BASE}|g" services/api/client.js

EXPOSE 12321

CMD ["live-server", "--port=12321", "--host=0.0.0.0", "--no-browser", "--wait=200", "."]
