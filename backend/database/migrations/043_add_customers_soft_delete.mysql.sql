-- Migration: Add soft delete support to customers table
-- Purpose: Enable soft deletion of customer records (DELETE /api/customers/:id)
-- Date: 2026-04-16

-- Add is_deleted column to customers table if it doesn't already exist
ALTER TABLE customers
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE AFTER created_at;

-- Create an index on is_deleted for efficient filtering during list operations
CREATE INDEX idx_customers_is_deleted ON customers(is_deleted);

-- Optional: Create a composite index for list operations with filtering
CREATE INDEX idx_customers_is_deleted_segment ON customers(is_deleted, segment);
