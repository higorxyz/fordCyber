CREATE TABLE IF NOT EXISTS secure_store (
  name TEXT PRIMARY KEY,
  payload TEXT NOT NULL CHECK (char_length(payload) > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS secure_store_updated_at_idx
  ON secure_store (updated_at DESC);
