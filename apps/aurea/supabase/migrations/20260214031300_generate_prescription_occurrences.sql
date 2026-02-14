CREATE OR REPLACE FUNCTION public.generate_prescription_occurrences(
  p_prescription_id uuid,
  p_date_from date,
  p_date_to date
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id uuid;
  v_patient_id uuid;
BEGIN
  IF p_date_from IS NULL OR p_date_to IS NULL OR p_date_from > p_date_to THEN
    RAISE EXCEPTION 'Invalid date range: % - %', p_date_from, p_date_to;
  END IF;
  SELECT p.company_id, p.patient_id INTO v_company_id, v_patient_id
  FROM public.prescription p
  WHERE p.id = p_prescription_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Prescription not found: %', p_prescription_id;
  END IF;
  CREATE TEMP TABLE tmp_occ_gen(
    prescription_item_id uuid NOT NULL,
    scheduled_at timestamptz NOT NULL,
    PRIMARY KEY (prescription_item_id, scheduled_at)
  ) ON COMMIT DROP;
  INSERT INTO tmp_occ_gen(prescription_item_id, scheduled_at)
  SELECT
    pi.id AS prescription_item_id,
    (d.day::timestamptz + t.time_val) AS scheduled_at
  FROM public.prescription_item pi
  JOIN LATERAL (
    SELECT dd::date AS day
    FROM generate_series(
      GREATEST(COALESCE(pi.start_date, p_date_from), p_date_from),
      LEAST(COALESCE(pi.end_date, p_date_to), p_date_to),
      interval '1 day'
    ) dd
  ) d ON true
  JOIN LATERAL (
    SELECT time_val
    FROM (
      SELECT unnest(pi.time_checks) AS time_val
      WHERE pi.time_checks IS NOT NULL
        AND array_length(pi.time_checks, 1) >= 1
        AND (pi.frequency_mode IS DISTINCT FROM 'every'::public.enum_prescription_frequency_mode)
      UNION ALL
      SELECT gs::time AS time_val
      FROM (
        SELECT generate_series(
          (d.day::timestamp + pi.time_start)::timestamp,
          (d.day::timestamp + interval '1 day' - interval '1 minute')::timestamp,
          make_interval(mins => pi.interval_minutes)
        ) AS gs
        WHERE pi.frequency_mode = 'every'::public.enum_prescription_frequency_mode
          AND pi.interval_minutes IS NOT NULL
          AND pi.interval_minutes > 0
          AND pi.time_start IS NOT NULL
          AND pi.is_prn = false
      ) q
    ) u
  ) t ON true
  WHERE pi.prescription_id = p_prescription_id
    AND pi.company_id = v_company_id
    AND pi.is_active = true
    AND pi.is_prn = false
    AND (
      pi.week_days IS NULL
      OR extract(isodow from d.day)::smallint = ANY(pi.week_days)
    );
  INSERT INTO public.prescription_item_occurrence(
    company_id,
    patient_id,
    prescription_id,
    prescription_item_id,
    scheduled_at,
    status,
    created_at,
    updated_at
  )
  SELECT
    v_company_id,
    v_patient_id,
    p_prescription_id,
    g.prescription_item_id,
    g.scheduled_at,
    'pending'::public.enum_prescription_occurrence_status,
    now(),
    now()
  FROM tmp_occ_gen g
  ON CONFLICT (prescription_item_id, scheduled_at)
  DO UPDATE SET
    updated_at = now(),
    status = CASE
      WHEN public.prescription_item_occurrence.status IN (
        'done'::public.enum_prescription_occurrence_status,
        'not_done'::public.enum_prescription_occurrence_status
      ) THEN public.prescription_item_occurrence.status
      WHEN public.prescription_item_occurrence.status = 'canceled'::public.enum_prescription_occurrence_status THEN public.prescription_item_occurrence.status
      ELSE 'pending'::public.enum_prescription_occurrence_status
    END;
  UPDATE public.prescription_item_occurrence o
  SET status = 'canceled'::public.enum_prescription_occurrence_status,
      updated_at = now()
  WHERE o.prescription_id = p_prescription_id
    AND o.company_id = v_company_id
    AND o.status = 'pending'::public.enum_prescription_occurrence_status
    AND o.scheduled_at >= (p_date_from::timestamptz)
    AND o.scheduled_at < ((p_date_to + 1)::timestamptz)
    AND NOT EXISTS (
      SELECT 1
      FROM tmp_occ_gen g
      WHERE g.prescription_item_id = o.prescription_item_id
        AND g.scheduled_at = o.scheduled_at
    );
END;
$$;
