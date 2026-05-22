CREATE TABLE parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  crew TEXT,
  epic_level INTEGER NOT NULL DEFAULT 1,
  is_special INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parties_date ON parties(date DESC);
CREATE INDEX idx_parties_crew ON parties(crew);

CREATE TABLE party_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);
