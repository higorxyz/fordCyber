CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_revoked_at_idx ON user_sessions (revoked_at);
CREATE INDEX IF NOT EXISTS user_sessions_last_seen_idx ON user_sessions (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_ip TEXT,
  requested_user_agent TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_hash_idx ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS password_resets_user_id_idx ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS password_resets_expires_at_idx ON password_resets (expires_at DESC);
