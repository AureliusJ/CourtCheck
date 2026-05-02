-- Run this in the Supabase SQL editor before testing the
-- aggregate-busy-times cron endpoint.
--
-- The JS query builder cannot express EXTRACT(...AT TIME ZONE),
-- so this is exposed as a Postgres function called via supabase.rpc().

CREATE OR REPLACE FUNCTION aggregate_busy_times()
RETURNS TABLE(
  board_id     TEXT,
  day_of_week  SMALLINT,
  hour_of_day  SMALLINT,
  avg_queue    NUMERIC,
  sample_size  INTEGER
) AS $$
  SELECT
    board_id,
    EXTRACT(DOW  FROM created_at AT TIME ZONE 'America/Toronto')::SMALLINT AS day_of_week,
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Toronto')::SMALLINT AS hour_of_day,
    AVG(queue_count)::NUMERIC(4,2)                                          AS avg_queue,
    COUNT(*)::INTEGER                                                        AS sample_size
  FROM reports
  WHERE created_at > NOW() - INTERVAL '7 days'
    AND photo_status != 'rejected'
  GROUP BY board_id, day_of_week, hour_of_day;
$$ LANGUAGE sql STABLE;
