PRAGMA foreign_keys = 1;

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY CHECK (length(user_id) > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
    habit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(name) > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

CREATE TABLE IF NOT EXISTS habit_logs (
    habit_id INTEGER NOT NULL,
    day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
    count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (habit_id) REFERENCES habits(habit_id),
    UNIQUE (habit_id, day)
);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);

CREATE TABLE IF NOT EXISTS user_sync_state (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL CHECK (length(data) > 1), -- Store the full HabitData as JSON
    last_updated INTEGER NOT NULL, -- Store Unix milliseconds UTC
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS  idx_user_sync_state_user_id ON user_sync_state(user_id);