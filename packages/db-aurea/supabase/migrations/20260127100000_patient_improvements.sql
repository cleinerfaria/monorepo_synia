-- =====================================================
-- PATIENT TABLE IMPROVEMENTS
-- =====================================================

-- Create gender enum type
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Rename document column to cpf and change to TEXT type
ALTER TABLE patient RENAME COLUMN document TO cpf;
ALTER TABLE patient ALTER COLUMN cpf TYPE TEXT;

-- Update gender column to use enum type
-- First, update existing values to match new enum
UPDATE patient SET gender = 
    CASE 
        WHEN gender = 'M' THEN 'male'
        WHEN gender = 'F' THEN 'female'
        WHEN gender = 'O' THEN 'other'
        ELSE NULL
    END;

-- Drop old check constraint (quietly, avoiding NOTICE on clean resets)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patient_gender_check'
      AND conrelid = 'public.patient'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.patient DROP CONSTRAINT patient_gender_check';
  END IF;
END $$;

-- Change column type to enum
ALTER TABLE patient ALTER COLUMN gender TYPE gender_type USING gender::gender_type;

-- Add unique constraint on CPF per company
CREATE UNIQUE INDEX idx_patient_cpf_unique ON patient(company_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';

-- Add index for better search performance
CREATE INDEX idx_patient_name ON patient(company_id, name);
CREATE INDEX idx_patient_cpf ON patient(company_id, cpf) WHERE cpf IS NOT NULL;
