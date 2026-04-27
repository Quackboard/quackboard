-- Backfill: resolve wildcard signup_opens_at on existing future recurring events.
-- For each future event whose sections_config has a wildcard section with relative
-- cutoff settings (signup_opens_at_days_before + signup_opens_at_time) but no
-- resolved signup_opens_at, compute the concrete UTC timestamp using the producer's
-- timezone and rewrite the section.

WITH targets AS (
  SELECT
    e.id AS event_id,
    e.date,
    COALESCE(p.timezone, 'America/Los_Angeles') AS tz,
    e.sections_config
  FROM events e
  JOIN producers p ON p.id = e.producer_id
  WHERE e.date >= CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(e.sections_config) s
      WHERE s->>'type' = 'wildcard'
        AND s ? 'signup_opens_at_days_before'
        AND s ? 'signup_opens_at_time'
        AND NOT (s ? 'signup_opens_at')
    )
),
rewritten AS (
  SELECT
    t.event_id,
    jsonb_agg(
      CASE
        WHEN s->>'type' = 'wildcard'
         AND s ? 'signup_opens_at_days_before'
         AND s ? 'signup_opens_at_time'
         AND NOT (s ? 'signup_opens_at')
        THEN jsonb_build_object(
          'label', s->>'label',
          'slots', COALESCE((s->>'slots')::int, 0),
          'type', 'wildcard',
          'signup_opens_at',
            to_char(
              (
                ((t.date - ((s->>'signup_opens_at_days_before')::int))::text
                  || ' ' || (s->>'signup_opens_at_time')
                )::timestamp AT TIME ZONE t.tz
              ) AT TIME ZONE 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            )
        )
        ELSE s
      END
      ORDER BY ord
    ) AS new_sections
  FROM targets t
  CROSS JOIN LATERAL jsonb_array_elements(t.sections_config) WITH ORDINALITY AS arr(s, ord)
  GROUP BY t.event_id
)
UPDATE events e
SET sections_config = r.new_sections
FROM rewritten r
WHERE e.id = r.event_id;