
-- Recreate list_my_shifts with check-in eligibility metadata for the mobile UI.
DROP FUNCTION IF EXISTS public.list_my_shifts(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.list_my_shifts(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE (
  id uuid,
  company_id uuid,
  patient_id uuid,
  pad_item_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  status public.enum_pad_shift_status,
  assigned_professional_id uuid,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_lat numeric,
  check_in_lng numeric,
  check_out_lat numeric,
  check_out_lng numeric,
  closed_by uuid,
  closure_note text,
  created_at timestamptz,
  updated_at timestamptz,
  can_check_in boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_shifts AS (
    SELECT s.*
    FROM public.pad_shift s
    WHERE s.company_id = public.current_company_id()
      AND (
        s.assigned_professional_id = public.current_professional_id()
        OR (
          s.status = 'open'::public.enum_pad_shift_status
          AND now() >= (s.start_at - interval '60 minutes')
          AND now() <= s.end_at
        )
      )
      AND s.start_at < p_to
      AND s.end_at > p_from
  )
  SELECT
    s.id,
    s.company_id,
    s.patient_id,
    s.pad_item_id,
    s.start_at,
    s.end_at,
    s.status,
    s.assigned_professional_id,
    s.check_in_at,
    s.check_out_at,
    s.check_in_lat,
    s.check_in_lng,
    s.check_out_lat,
    s.check_out_lng,
    s.closed_by,
    s.closure_note,
    s.created_at,
    s.updated_at,
    (
      s.status IN ('open'::public.enum_pad_shift_status, 'assigned'::public.enum_pad_shift_status)
      AND now() >= (s.start_at - interval '60 minutes')
      AND now() <= s.end_at
      AND (prev_shift.id IS NULL OR prev_shift.check_out_at IS NOT NULL)
    ) AS can_check_in
  FROM my_shifts s
  LEFT JOIN LATERAL (
    SELECT ps.id, ps.check_out_at
    FROM public.pad_shift ps
    WHERE ps.company_id = s.company_id
      AND ps.patient_id = s.patient_id
      AND ps.pad_item_id = s.pad_item_id
      AND ps.start_at < s.start_at
      AND ps.assigned_professional_id IS NOT NULL
    ORDER BY ps.start_at DESC
    LIMIT 1
  ) AS prev_shift ON true
  ORDER BY s.start_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_shifts(timestamptz, timestamptz) TO authenticated;

-- Recreate shift_check_in to enforce previous professional checkout.
DROP FUNCTION IF EXISTS public.shift_check_in(uuid, numeric, numeric);

CREATE OR REPLACE FUNCTION public.shift_check_in(
  p_shift_id uuid,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL
) RETURNS public.pad_shift
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.pad_shift;
  v_prof uuid := public.current_professional_id();
  v_comp uuid := public.current_company_id();
  v_previous_assigned_shift RECORD;
BEGIN
  IF v_prof IS NULL OR v_comp IS NULL THEN
    RAISE EXCEPTION 'Professional not linked to this user';
  END IF;

  SELECT *
  INTO v_shift
  FROM public.pad_shift
  WHERE id = p_shift_id
    AND company_id = v_comp
  FOR UPDATE;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF now() < (v_shift.start_at - interval '60 minutes') OR now() > v_shift.end_at THEN
    RAISE EXCEPTION 'Check-in outside allowed window';
  END IF;

  SELECT ps.id, ps.check_out_at
  INTO v_previous_assigned_shift
  FROM public.pad_shift ps
  WHERE ps.company_id = v_comp
    AND ps.patient_id = v_shift.patient_id
    AND ps.pad_item_id = v_shift.pad_item_id
    AND ps.start_at < v_shift.start_at
    AND ps.assigned_professional_id IS NOT NULL
  ORDER BY ps.start_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_previous_assigned_shift.id IS NOT NULL AND v_previous_assigned_shift.check_out_at IS NULL THEN
    RAISE EXCEPTION 'Previous professional has not checked out yet';
  END IF;

  IF v_shift.status = 'assigned'::public.enum_pad_shift_status THEN
    IF v_shift.assigned_professional_id IS DISTINCT FROM v_prof THEN
      RAISE EXCEPTION 'Not allowed: shift is assigned to another professional';
    END IF;

  ELSIF v_shift.status = 'open'::public.enum_pad_shift_status THEN
    UPDATE public.pad_shift
    SET assigned_professional_id = v_prof,
        status = 'assigned'::public.enum_pad_shift_status,
        updated_at = now()
    WHERE id = v_shift.id;

    INSERT INTO public.pad_event(company_id, shift_id, type, actor_professional_id)
    VALUES (v_comp, v_shift.id, 'claim', v_prof);

  ELSE
    RAISE EXCEPTION 'Invalid shift status for check-in: %', v_shift.status;
  END IF;

  UPDATE public.pad_shift
  SET status = 'in_progress'::public.enum_pad_shift_status,
      check_in_at = COALESCE(check_in_at, now()),
      check_in_lat = p_lat,
      check_in_lng = p_lng,
      updated_at = now()
  WHERE id = v_shift.id;

  INSERT INTO public.pad_event(company_id, shift_id, type, actor_professional_id)
  VALUES (v_comp, v_shift.id, 'checkin', v_prof);

  SELECT * INTO v_shift FROM public.pad_shift WHERE id = v_shift.id;
  RETURN v_shift;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_check_in(uuid, numeric, numeric) TO authenticated;
