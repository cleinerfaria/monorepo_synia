-- Migration: Add 'cancelled' status to ref_import_batch
-- This allows users to cancel/delete imports while keeping the batch record

-- Update the CHECK constraint to include 'cancelled' status
ALTER TABLE ref_import_batch 
DROP CONSTRAINT IF EXISTS ref_import_batch_status_check;

ALTER TABLE ref_import_batch 
ADD CONSTRAINT ref_import_batch_status_check 
CHECK (status IN ('pending', 'running', 'success', 'failed', 'partial', 'cancelled'));

-- Add index for cancelled status queries

COMMENT ON COLUMN ref_import_batch.status IS 'Status da importação: pending, running, success, failed, partial, cancelled';
