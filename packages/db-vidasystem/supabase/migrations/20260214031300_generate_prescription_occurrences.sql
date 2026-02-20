BEGIN;

-- =====================================================
-- Função: generate_prescription_occurrences
-- Gera ocorrências de checagem (prescription_item_occurrence)
-- para um intervalo de datas (normalmente hoje + amanhã)
--
-- REGRAS IMPORTANTES:
-- - Não gera para PRN
-- - time_checks sempre tem prioridade
-- - frequency_mode = 'shift' usa âncoras:
--      07:00 = M
--      13:00 = T
--      19:00 = N
-- - Não sobrescreve ocorrências já checadas
-- - Cancela ocorrências futuras inválidas após alteração de prescrição
-- =====================================================

DO $$
BEGIN
  IF to_regprocedure('public.generate_prescription_occurrences(uuid, date, date)') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION public.generate_prescription_occurrences(uuid, date, date)';
  END IF;
END $$;

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

  -- =====================================================
  -- Validação básica
  -- =====================================================
  IF p_date_from IS NULL OR p_date_to IS NULL OR p_date_from > p_date_to THEN
    RAISE EXCEPTION 'Invalid date range: % - %', p_date_from, p_date_to;
  END IF;

  SELECT company_id, patient_id
    INTO v_company_id, v_patient_id
  FROM prescription
  WHERE id = p_prescription_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Prescription not found: %', p_prescription_id;
  END IF;

  -- =====================================================
  -- Tabela temporária com as ocorrências calculadas
  -- =====================================================
  CREATE TEMP TABLE tmp_occ_gen(
    prescription_item_id uuid NOT NULL,
    scheduled_at timestamptz NOT NULL,
    PRIMARY KEY (prescription_item_id, scheduled_at)
  ) ON COMMIT DROP;

  -- =====================================================
  -- Geração das ocorrências
  -- =====================================================
  INSERT INTO tmp_occ_gen(prescription_item_id, scheduled_at)
  SELECT
    pi.id,
    (d.day::timestamptz + t.time_val) AS scheduled_at
  FROM prescription_item pi

  -- Gera os dias válidos do item
  JOIN LATERAL (
    SELECT dd::date AS day
    FROM generate_series(
      GREATEST(COALESCE(pi.start_date, p_date_from), p_date_from),
      LEAST(COALESCE(pi.end_date, p_date_to), p_date_to),
      interval '1 day'
    ) dd
  ) d ON true

  -- Define horários
  JOIN LATERAL (
    SELECT time_val
    FROM (

      -- =====================================================
      -- 1) Horários fixos (time_checks)
      -- =====================================================
      SELECT unnest(pi.time_checks) AS time_val
      WHERE pi.time_checks IS NOT NULL
        AND array_length(pi.time_checks,1) >= 1
        AND pi.frequency_mode IS DISTINCT FROM 'every'::enum_prescription_frequency_mode

      UNION ALL

      -- =====================================================
      -- 2) Intervalo (Qx horas)
      -- =====================================================
      SELECT gs::time
      FROM (
        SELECT generate_series(
          (d.day::timestamp + pi.time_start)::timestamp,
          (d.day::timestamp + interval '1 day' - interval '1 minute')::timestamp,
          make_interval(mins => pi.interval_minutes)
        ) AS gs
        WHERE pi.frequency_mode = 'every'
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

    -- Respeita dias da semana
    AND (
      pi.week_days IS NULL
      OR extract(isodow from d.day)::smallint = ANY(pi.week_days)
    );

  -- =====================================================
  -- UPSERT das ocorrências
  -- Não sobrescreve DONE/NOT_DONE
  -- =====================================================
  INSERT INTO prescription_item_occurrence(
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
    'pending'::enum_prescription_occurrence_status,
    now(),
    now()
  FROM tmp_occ_gen g

  ON CONFLICT (prescription_item_id, scheduled_at)
  DO UPDATE SET
    updated_at = now(),
    status = CASE
      WHEN prescription_item_occurrence.status IN ('done','not_done')
        THEN prescription_item_occurrence.status
      WHEN prescription_item_occurrence.status = 'canceled'
        THEN prescription_item_occurrence.status
      ELSE 'pending'
    END;

  -- =====================================================
  -- Cancela ocorrências futuras que não existem mais
  -- =====================================================
  UPDATE prescription_item_occurrence o
  SET status = 'canceled',
      updated_at = now()
  WHERE o.prescription_id = p_prescription_id
    AND o.company_id = v_company_id
    AND o.status = 'pending'
    AND o.scheduled_at >= p_date_from
    AND o.scheduled_at < (p_date_to + 1)
    AND NOT EXISTS (
      SELECT 1
      FROM tmp_occ_gen g
      WHERE g.prescription_item_id = o.prescription_item_id
        AND g.scheduled_at = o.scheduled_at
    );

END;
$$;

COMMIT;
