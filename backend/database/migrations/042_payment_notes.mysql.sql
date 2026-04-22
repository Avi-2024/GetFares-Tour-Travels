-- Migration: Add notes column to payments table
-- Date: 2026-04-16
-- Description: Adds a TEXT column to store payment notes

ALTER TABLE payments ADD COLUMN notes TEXT NULL;