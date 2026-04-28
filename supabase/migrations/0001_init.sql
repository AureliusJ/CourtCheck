-- Parks: top-level entity (single row in v1)
CREATE TABLE parks (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    address           TEXT,
    latitude          NUMERIC(9,6) NOT NULL,
    longitude         NUMERIC(9,6) NOT NULL,
    timezone          TEXT NOT NULL,
    has_lights        BOOLEAN NOT NULL DEFAULT FALSE,
    default_photo_url TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Boards: queue boards within a park (3 for Ramsden)
CREATE TABLE boards (
    id                TEXT PRIMARY KEY,
    park_id           TEXT NOT NULL REFERENCES parks(id),
    label             TEXT NOT NULL,
    courts_on_board   SMALLINT NOT NULL CHECK (courts_on_board > 0),
    court_range_label TEXT NOT NULL,
    display_order     SMALLINT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports: append-only crowdsourced submissions
CREATE TABLE reports (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    park_id           TEXT NOT NULL REFERENCES parks(id),
    board_id          TEXT NOT NULL REFERENCES boards(id),
    queue_count       SMALLINT NOT NULL CHECK (queue_count BETWEEN 0 AND 15),
    court_condition   TEXT NOT NULL CHECK (court_condition IN ('dry', 'wet', 'unknown')),
    photo_url         TEXT,
    photo_status      TEXT NOT NULL DEFAULT 'none'
                      CHECK (photo_status IN ('none', 'pending', 'approved', 'rejected', 'expired')),
    photo_expires_at  TIMESTAMPTZ,
    device_hash       TEXT NOT NULL,
    ip_hash           TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_board_recent  ON reports (board_id, created_at DESC);
CREATE INDEX idx_reports_park_recent   ON reports (park_id, created_at DESC);
CREATE INDEX idx_reports_device_recent ON reports (device_hash, board_id, created_at DESC);
CREATE INDEX idx_reports_busy_times    ON reports (board_id, created_at)
    WHERE photo_status != 'rejected';
CREATE INDEX idx_reports_photo_expiry  ON reports (photo_expires_at)
    WHERE photo_url IS NOT NULL AND photo_status = 'approved';