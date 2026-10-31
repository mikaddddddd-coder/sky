-- One row per answer to the after-sunset question, with the forecast we made for that evening.
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  install_id TEXT NOT NULL,
  evening_key TEXT NOT NULL,      -- city:date
  city_id TEXT NOT NULL,
  lat REAL NOT NULL,              -- rounded to 0.01°
  lon REAL NOT NULL,
  sunset TEXT NOT NULL,           -- ISO time of the sunset asked about
  why TEXT NOT NULL,              -- 'score' (promising evening) or 'sample' (random low-score evening)
  rating INTEGER NOT NULL,        -- 0 no colour, 1 some colour, 2 on fire
  score REAL,
  vividness REAL,
  edge_km REAL,
  fire INTEGER,
  lead_days INTEGER,
  forecast_json TEXT NOT NULL,    -- the full forecast: inputs and reasons
  lang TEXT,
  app_version TEXT,
  answered_at TEXT,
  UNIQUE (install_id, evening_key)
);

CREATE INDEX IF NOT EXISTS feedback_sunset ON feedback (sunset);
