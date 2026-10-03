# Công nghệ

## Ngôn ngữ

Rust, edition 2024.

## Web framework

Actix-web 4. Xử lý HTTP, routing, middleware, extractor.

## Database

PostgreSQL 15. Cơ sở dữ liệu quan hệ, hỗ trợ JSONB, TIMESTAMPTZ, UNIQUE, CHECK.

## ORM

Diesel 2.3. Query builder, schema generation, migrations.

## Connection pool

r2d2. Quản lý pool kết nối, tái sử dụng connection.

## Authentication

JSON Web Token, thuật toán HS256. Claims gồm `sub`, `roles`, `exp`, `iat`.

## Password hashing

Argon2. Hash và verify password.

## Environment

dotenvy. Đọc file `.env` vào biến môi trường.

## Logging

tracing và tracing-subscriber. Structured logging.

## Error handling

anyhow và thiserror. Xử lý lỗi có kiểu và bắt lỗi tổng quát.

## Serialization

serde và serde_json. Chuyển đổi struct ↔ JSON.

## Testing

cargo test. Unit test và integration test.

## Container

Podman, docker-compose. Chạy PostgreSQL.

## Build

Nix shell. Môi trường phát triển cô lập.

## Phiên bản

| Công cụ | Phiên bản |
|---|---|
| Rust | 1.97.1 |
| Actix-web | 4.15.0 |
| Diesel | 2.3.13 |
| PostgreSQL | 15 |
| jsonwebtoken | 11.1.0 |
| serde | 1.0.229 |
| tracing | 0.1.44 |
| dotenvy | 0.15.7 |
| anyhow | 1.0.104 |
| thiserror | 2.0.21 |
