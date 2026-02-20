BEGIN;

-- =====================================================
-- Helpers (agora usando professional_user)
-- =====================================================
DO $$
BEGIN
  IF to_regprocedure('public.current_professional_id()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.current_professional_id()';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.current_professional_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pu.professional_id
  FROM public.professional_user pu
  WHERE pu.user_id = auth.uid()
    AND pu.is_active = true
  LIMIT 1
$$;

DO $$
BEGIN
  IF to_regprocedure('public.current_company_id()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.current_company_id()';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pu.company_id
  FROM public.professional_user pu
  WHERE pu.user_id = auth.uid()
    AND pu.is_active = true
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_professional_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

-- =====================================================
-- Recriar RPCs do plantão (dependem dos helpers)
-- =====================================================
DO $$
BEGIN
  IF to_regprocedure('public.list_my_shifts(timestamptz, timestamptz)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.list_my_shifts(timestamptz, timestamptz)';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.list_my_shifts(
  p_from timestamptz,
  p_to timestamptz
) RETURNS SETOF public.patient_attendance_shift
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.patient_attendance_shift s
  WHERE s.company_id = public.current_company_id()
    AND (
      s.assigned_professional_id = public.current_professional_id()
      OR (
        s.status = 'open'::public.enum_patient_attendance_shift_status
        AND now() >= (s.start_at - interval '60 minutes')
        AND now() <= s.end_at
      )
    )
    AND s.start_at < p_to
    AND s.end_at > p_from
  ORDER BY s.start_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.list_my_shifts(timestamptz, timestamptz) TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.get_my_active_shift()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.get_my_active_shift()';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.get_my_active_shift()
RETURNS public.patient_attendance_shift
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.patient_attendance_shift s
  WHERE s.company_id = public.current_company_id()
    AND s.assigned_professional_id = public.current_professional_id()
    AND s.status = 'in_progress'::public.enum_patient_attendance_shift_status
  ORDER BY s.start_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_shift() TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.shift_check_in(uuid, numeric, numeric)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.shift_check_in(uuid, numeric, numeric)';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.shift_check_in(
  p_shift_id uuid,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL
) RETURNS public.patient_attendance_shift
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.patient_attendance_shift;
  v_prof uuid := public.current_professional_id();
  v_comp uuid := public.current_company_id();
BEGIN
  IF v_prof IS NULL OR v_comp IS NULL THEN
    RAISE EXCEPTION 'Professional not linked to this user';
  END IF;

  SELECT *
  INTO v_shift
  FROM public.patient_attendance_shift
  WHERE id = p_shift_id
    AND company_id = v_comp
  FOR UPDATE;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF now() < (v_shift.start_at - interval '60 minutes') OR now() > v_shift.end_at THEN
    RAISE EXCEPTION 'Check-in outside allowed window';
  END IF;

  IF v_shift.status = 'assigned'::public.enum_patient_attendance_shift_status THEN
    IF v_shift.assigned_professional_id IS DISTINCT FROM v_prof THEN
      RAISE EXCEPTION 'Not allowed: shift is assigned to another professional';
    END IF;

  ELSIF v_shift.status = 'open'::public.enum_patient_attendance_shift_status THEN
    UPDATE public.patient_attendance_shift
    SET assigned_professional_id = v_prof,
        status = 'assigned'::public.enum_patient_attendance_shift_status,
        updated_at = now()
    WHERE id = v_shift.id;

    INSERT INTO public.patient_attendance_event(company_id, shift_id, type, actor_professional_id)
    VALUES (v_comp, v_shift.id, 'claim', v_prof);

  ELSE
    RAISE EXCEPTION 'Invalid shift status for check-in: %', v_shift.status;
  END IF;

  UPDATE public.patient_attendance_shift
  SET status = 'in_progress'::public.enum_patient_attendance_shift_status,
      check_in_at = COALESCE(check_in_at, now()),
      check_in_lat = p_lat,
      check_in_lng = p_lng,
      updated_at = now()
  WHERE id = v_shift.id;

  INSERT INTO public.patient_attendance_event(company_id, shift_id, type, actor_professional_id)
  VALUES (v_comp, v_shift.id, 'checkin', v_prof);

  SELECT * INTO v_shift FROM public.patient_attendance_shift WHERE id = v_shift.id;
  RETURN v_shift;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_check_in(uuid, numeric, numeric) TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.shift_check_out(uuid, numeric, numeric)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.shift_check_out(uuid, numeric, numeric)';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.shift_check_out(
  p_shift_id uuid,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL
) RETURNS public.patient_attendance_shift
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.patient_attendance_shift;
  v_prof uuid := public.current_professional_id();
  v_comp uuid := public.current_company_id();
BEGIN
  IF v_prof IS NULL OR v_comp IS NULL THEN
    RAISE EXCEPTION 'Professional not linked to this user';
  END IF;

  SELECT *
  INTO v_shift
  FROM public.patient_attendance_shift
  WHERE id = p_shift_id
    AND company_id = v_comp
  FOR UPDATE;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF v_shift.assigned_professional_id IS DISTINCT FROM v_prof THEN
    RAISE EXCEPTION 'Not allowed: shift is assigned to another professional';
  END IF;

  IF v_shift.status IS DISTINCT FROM 'in_progress'::public.enum_patient_attendance_shift_status THEN
    RAISE EXCEPTION 'Invalid shift status for check-out: %', v_shift.status;
  END IF;

  UPDATE public.patient_attendance_shift
  SET status = 'finished'::public.enum_patient_attendance_shift_status,
      check_out_at = COALESCE(check_out_at, now()),
      check_out_lat = p_lat,
      check_out_lng = p_lng,
      updated_at = now()
  WHERE id = v_shift.id;

  INSERT INTO public.patient_attendance_event(company_id, shift_id, type, actor_professional_id)
  VALUES (v_comp, v_shift.id, 'checkout', v_prof);

  SELECT * INTO v_shift FROM public.patient_attendance_shift WHERE id = v_shift.id;
  RETURN v_shift;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_check_out(uuid, numeric, numeric) TO authenticated;

COMMIT;
