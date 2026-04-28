INSERT INTO parks (id, name, address, latitude, longitude, timezone, has_lights)
VALUES (
    'ramsden',
    'Ramsden Park',
    '1020 Yonge St & Ramsden Park Rd, Toronto, ON M4W 1P7',
    43.677200,
    -79.391900,
    'America/Toronto',
    FALSE
);

INSERT INTO boards (id, park_id, label, courts_on_board, court_range_label, display_order) VALUES
    ('ramsden-a', 'ramsden', 'Board A', 2, 'Courts 1–2', 1),
    ('ramsden-b', 'ramsden', 'Board B', 2, 'Courts 3–4', 2),
    ('ramsden-c', 'ramsden', 'Board C', 4, 'Courts 5–8', 3);