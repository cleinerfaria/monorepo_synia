BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.generate_patient_attendance_shifts(uuid, date, date)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.generate_patient_attendance_shifts(uuid, date, date)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_patient_attendance_shifts(
  p_pad_id uuid,
  p_date_from date,
  p_date_to date
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_pad public.patient_attendance_demand;
  v_day date;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
  v_duration interval;
  v_second_duration interval;
BEGIN

  -- =============================
  -- Carrega PAD
  -- =============================
  SELECT *
  INTO v_pad
  FROM public.patient_attendance_demand
  WHERE id = p_pad_id
    AND is_active = true;

  IF v_pad.id IS NULL THEN
    RAISE EXCEPTION 'PAD not found or inactive';
  END IF;

  IF p_date_from > p_date_to THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  -- =============================
  -- Loop por dia
  -- =============================
  FOR v_day IN
    SELECT generate_series(
      GREATEST(v_pad.start_date, p_date_from),
      LEAST(COALESCE(v_pad.end_date, p_date_to), p_date_to),
      interval '1 day'
    )::date
  LOOP

    -- duração principal
    v_duration :=
      CASE v_pad.hours_per_day
        WHEN 24 THEN interval '24 hours'
        WHEN 12 THEN interval '12 hours'
        WHEN 6  THEN interval '6 hours'
        WHEN 4  THEN interval '4 hours'
      END;

    -- =============================
    -- SHIFT 1
    -- =============================
    v_shift_start := (v_day::timestamp + v_pad.start_time);
    v_shift_end   := v_shift_start + (
      CASE
        WHEN v_pad.is_split AND v_pad.hours_per_day = 24 THEN interval '12 hours'
        WHEN v_pad.is_split AND v_pad.hours_per_day = 12 THEN interval '6 hours'
        ELSE v_duration
      END
    );

    INSERT INTO public.patient_attendance_shift(
      company_id,
      patient_id,
      patient_attendance_demand_id,
      start_at,
      end_at,
      status
    )
    VALUES(
      v_pad.company_id,
      v_pad.patient_id,
      v_pad.id,
      v_shift_start,
      v_shift_end,
      'open'
    )
    ON CONFLICT DO NOTHING;

    -- =============================
    -- SHIFT 2 (se fracionado)
    -- =============================
    IF v_pad.is_split AND v_pad.hours_per_day IN (12,24) THEN

      v_shift_start := v_shift_end;
      v_shift_end := v_shift_start + (
        CASE
          WHEN v_pad.hours_per_day = 24 THEN interval '12 hours'
          WHEN v_pad.hours_per_day = 12 THEN interval '6 hours'
        END
      );

      INSERT INTO public.patient_attendance_shift(
        company_id,
        patient_id,
        patient_attendance_demand_id,
        start_at,
        end_at,
        status
      )
      VALUES(
        v_pad.company_id,
        v_pad.patient_id,
        v_pad.id,
        v_shift_start,
        v_shift_end,
        'open'
      )
      ON CONFLICT DO NOTHING;

    END IF;

  END LOOP;

END;
$$;

COMMIT;
