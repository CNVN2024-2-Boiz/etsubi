# Entities

Etsubi dùng PostgreSQL 15 với 10 bảng nghiệp vụ, truy cập qua Diesel ORM.

```mermaid
erDiagram
    USERS {
        uuid id PK
        text username UK
        text email UK
        text language
        text password
        text role
        text status
        timestamptz muted_until
        int token_version
    }
    USER_FOLLOWS {
        uuid follower_id PK
        uuid following_id PK
        timestamptz followed_at
    }
    POSTS {
        uuid id PK
        uuid author_id FK
        text title
        text content
        text language
        text status
        bool comments_locked
        timestamptz deleted_at
    }
    COMMENTS {
        uuid id PK
        uuid parent_id FK
        uuid post_id FK
        uuid user_id FK
        text content
        text language
        text status
        timestamptz deleted_at
    }
    REACTIONS {
        uuid user_id PK
        uuid post_id PK
        text emoji
        timestamptz reacted_at
    }
    BOOKMARKS {
        uuid user_id PK
        uuid post_id PK
        timestamptz bookmarked_at
    }
    TAGS {
        uuid id PK
        text name UK
        text description
    }
    POSTS_TAGS {
        uuid post_id PK
        uuid tag_id PK
    }
    POST_TRANSLATIONS {
        uuid original_post_id PK
        text language PK
        text title
        text content
        timestamptz deleted_at
    }
    COMMENT_TRANSLATIONS {
        uuid original_comment_id PK
        text language PK
        text content
        timestamptz deleted_at
    }

    USERS ||--o{ POSTS : author
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ REACTIONS : reacts
    USERS ||--o{ BOOKMARKS : saves
    USERS ||--o{ USER_FOLLOWS : follower
    USERS ||--o{ USER_FOLLOWS : following
    POSTS ||--o{ COMMENTS : has
    POSTS ||--o{ REACTIONS : has
    POSTS ||--o{ BOOKMARKS : has
    POSTS ||--o{ POSTS_TAGS : tagged
    POSTS ||--o{ POST_TRANSLATIONS : cached
    COMMENTS ||--o{ COMMENTS : replies
    COMMENTS ||--o{ COMMENT_TRANSLATIONS : cached
    TAGS ||--o{ POSTS_TAGS : applied
```

## Nhóm bảng

| Nhóm | Bảng | Ghi chú |
|---|---|---|
| Người dùng | `users`, `users_follows` | Follow là N:M tự thân, có `CHECK (follower_id <> following_id)` |
| Nội dung | `posts`, `comments` | Soft-delete bằng `deleted_at`; comment reply qua `parent_id` |
| Tương tác | `reactions`, `bookmarks`, `tags`, `posts_tags` | Reaction và bookmark là N:M với PK tổng hợp, mỗi cặp user-post chỉ một bản ghi |
| Cache dịch | `post_translation`, `comment_translation` | PK `(entity_id, language)`; `deleted_at` vô hiệu cache khi nội dung gốc đổi |

## Quy ước

- `id` là UUID (`gen_random_uuid()`); thời gian là `TIMESTAMPTZ` UTC.
- `language` chỉ nhận `vi`, `en`, `ja`.
- `users` hard-delete, CASCADE xuống mọi bảng con. `posts`/`comments` và 2 bảng translation soft-delete.
- `users.token_version` dùng để invalid JWT cũ khi logout / đổi mật khẩu.
