-- Every user action, with a UTC timestamp. Kept long term: streaks and habit
-- tracking will be built on this table.
CREATE TABLE activity_log (
    id         INTEGER PRIMARY KEY,
    kind       TEXT NOT NULL,
    payload    TEXT NOT NULL, -- JSON
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
