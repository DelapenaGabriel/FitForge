-- =============================================
-- FitForge Database Schema
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    owner_id        BIGINT NOT NULL REFERENCES users(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS group_members (
    id              BIGSERIAL PRIMARY KEY,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    start_weight    NUMERIC(6,2),
    goal_weight     NUMERIC(6,2),
    joined_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    weight_lbs      NUMERIC(6,2),
    calories        INTEGER,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, group_id, log_date)
);

CREATE TABLE IF NOT EXISTS log_photos (
    id              BIGSERIAL PRIMARY KEY,
    log_id          BIGINT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    photo_url       VARCHAR(500) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_targets (
    id              BIGSERIAL PRIMARY KEY,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_number     INTEGER NOT NULL,
    target_weight   NUMERIC(6,2) NOT NULL,
    actual_weight   NUMERIC(6,2),
    coach_override  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS coach_posts (
    id              BIGSERIAL PRIMARY KEY,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    post_type       VARCHAR(30) NOT NULL DEFAULT 'ADVICE',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_invites (
    id              BIGSERIAL PRIMARY KEY,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invite_email    VARCHAR(255),
    token           VARCHAR(100) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_group ON daily_logs(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_weekly_targets_group_user ON weekly_targets(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_coach_posts_group ON coach_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);
