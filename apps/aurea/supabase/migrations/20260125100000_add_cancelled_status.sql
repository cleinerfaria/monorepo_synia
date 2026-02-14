-- Migration: Add 'cancelled' status to ref_import_batch
-- This allows users to cancel/delete imports while keeping the batch record

-- Update the CHECK constraint to include 'cancelled' status
ALTER TABLE ref_import_batch 
DROP CONSTRAINT IF EXISTS ref_import_batch_status_check;

ALTER TABLE ref_import_batch 
ADD CONSTRAINT ref_import_batch_status_check 
CHECK (status IN ('pending', 'running', 'success', 'failed', 'partial', 'cancelled'));

-- Add index for cancelled status queries
CREATE INDEX IF NOT EXISTS idx_ref_import_batch_cancelled 
ON ref_import_batch(source_id, status) 
WHERE status = 'cancelled';

COMMENT ON COLUMN ref_import_batch.status IS 'Status da importação: pending, running, success, failed, partial, cancelled';
