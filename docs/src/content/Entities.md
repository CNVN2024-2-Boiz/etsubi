# Entities

## ER Diagram

```mermaid
erDiagram
    users ||--o{ posts : "author_id"
    users ||--o{ comments : "user_id"
    users ||--o{ reports : "reporter_id"
    users ||--o{ users_follows : "follower_id"
    users ||--o{ users_follows : "following_id"
    users ||--o{ users_blocks : "blocker_id"
    users ||--o{ users_blocks : "blocked_id"
    users ||--o{ reactions : "user_id"
    users ||--o{ bookmarks : "user_id"

    posts ||--o{ comments : "post_id"
    posts ||--o{ posts_tags : "post_id"
    posts ||--o{ reactions : "post_id"
    posts ||--o{ bookmarks : "post_id"
    posts ||--o{ reports : "post_id"

    comments ||--o{ comments : "parent_id"
    comments ||--o{ reports : "comment_id"

    tags ||--o{ posts_tags : "tag_id"

    users {
        uuid id PK
        text username UK
        text email UK
        text password
        text avatar_url
        text bio
        text role
        text status
        timestamptz muted_until
        timestamptz created_at
        timestamptz updated_at
    }

    posts {
        uuid id PK
        uuid author_id FK
        text title
        text content
        int view_count
        text status
        bool comments_locked
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }

    comments {
        uuid id PK
        uuid parent_id FK
        uuid post_id FK
        uuid user_id FK
        text content
        text status
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }

    tags {
        uuid id PK
        text name
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    posts_tags {
        uuid post_id PK_FK
        uuid tag_id PK_FK
    }

    reactions {
        uuid user_id PK_FK
        uuid post_id PK_FK
        text emoji
        timestamptz reacted_at
    }

    bookmarks {
        uuid user_id PK_FK
        uuid post_id PK_FK
        timestamptz bookmarked_at
    }

    users_follows {
        uuid follower_id PK_FK
        uuid following_id PK_FK
        timestamptz followed_at
    }

    users_blocks {
        uuid blocker_id PK_FK
        uuid blocked_id PK_FK
        timestamptz blocked_at
    }

    reports {
        uuid id PK
        uuid reporter_id FK
        uuid post_id FK
        uuid comment_id FK
        text reason
        text detail
        text status
        timestamptz resolved_at
        timestamptz created_at
    }
```

## Bảng chi tiết

### users

Người dùng hệ thống.

| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | UUID | Primary key |
| username | text | Unique, tối thiểu 3 ký tự |
| email | text | Unique, bất biến sau khi tạo |
| password | text | Hash Argon2 |
| avatar_url | text? | |
| bio | text? | |
| role | text | `user`, `moderator`, `admin` |
| status | text | `pending`, `active`, `banned` |
| muted_until | timestamptz? | Hết hạn mute |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### posts

Bài viết.

| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | UUID | |
| author_id | UUID | FK → users |
| title | text | Tối đa 255 ký tự |
| content | text? | Tối đa 100,000 ký tự |
| view_count | int | Default 0 |
| status | text | `published`, `hidden` |
| comments_locked | bool | Khoá bình luận |
| deleted_at | timestamptz? | Xoá mềm |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### comments

Bình luận, hỗ trợ reply.

| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | UUID | |
| parent_id | UUID? | FK → comments (reply) |
| post_id | UUID | FK → posts |
| user_id | UUID | FK → users |
| content | text | Tối đa 10,000 ký tự |
| status | text | `visible`, `hidden` |
| deleted_at | timestamptz? | Xoá mềm |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### tags

Nhãn phân loại bài viết.

| Trường | Kiểu |
|--------|------|
| id | UUID |
| name | text |
| description | text? |
| created_at | timestamptz |
| updated_at | timestamptz |

### posts_tags

Quan hệ N-N giữa `posts` và `tags`.

| Trường | Kiểu |
|--------|------|
| post_id | UUID, FK → posts |
| tag_id | UUID, FK → tags |

Primary key: `(post_id, tag_id)`.

### reactions

User thả emoji vào post.

| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| user_id | UUID | FK → users |
| post_id | UUID | FK → posts |
| emoji | text | |
| reacted_at | timestamptz | |

Primary key: `(user_id, post_id)` — mỗi user chỉ có 1 reaction / post.

### bookmarks

User lưu post.

| Trường | Kiểu |
|--------|------|
| user_id | UUID, FK → users |
| post_id | UUID, FK → posts |
| bookmarked_at | timestamptz |

Primary key: `(user_id, post_id)`.

### users_follows

Quan hệ follow giữa users.

| Trường | Kiểu |
|--------|------|
| follower_id | UUID, FK → users |
| following_id | UUID, FK → users |
| followed_at | timestamptz |

Primary key: `(follower_id, following_id)`. Có CHECK `follower_id <> following_id`.

### users_blocks

Quan hệ block giữa users.

| Trường | Kiểu |
|--------|------|
| blocker_id | UUID, FK → users |
| blocked_id | UUID, FK → users |
| blocked_at | timestamptz |

Primary key: `(blocker_id, blocked_id)`. Có CHECK `blocker_id <> blocked_id`.

### reports

Báo cáo vi phạm.

| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | UUID | |
| reporter_id | UUID | FK → users |
| post_id | UUID? | FK → posts |
| comment_id | UUID? | FK → comments |
| reason | text | |
| detail | text? | |
| status | text | `pending`, `resolved`, `rejected` |
| resolved_at | timestamptz? | |
| created_at | timestamptz | |

CHECK constraint: chỉ một trong `post_id` hoặc `comment_id` là non-null.

## Trạng thái implement

Các bảng sau **đã có schema DB** nhưng **chưa có API**: `tags`, `posts_tags`, `reactions`, `bookmarks`, `users_follows`, `users_blocks`, `reports`.
