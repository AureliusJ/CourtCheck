    CREATE TABLE busy_times_hourly (
    board_id      TEXT NOT NULL REFERENCES boards(id),
    day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_of_day   SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    avg_queue     NUMERIC(4,2) NOT NULL,
    sample_size   INTEGER NOT NULL,
    computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (board_id, day_of_week, hour_of_day)
);