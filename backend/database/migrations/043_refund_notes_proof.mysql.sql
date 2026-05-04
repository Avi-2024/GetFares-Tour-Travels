-- Migration: Add refund notes and proof uploads
-- Description: Stores refund proof image/document URLs and account notes.

ALTER TABLE refunds
  ADD COLUMN proof_url TEXT NULL,
  ADD COLUMN notes TEXT NULL;
