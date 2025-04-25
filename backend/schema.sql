CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username UNIQUE TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
    habit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE (user_id, name)
);
CREATE INDEX idx_habits_user_id ON habits(user_id);

CREATE TABLE IF NOT EXISTS habit_logs (
    habit_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    day TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(habit_id)
);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);