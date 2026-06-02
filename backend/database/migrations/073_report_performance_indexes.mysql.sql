SET @schema_name = DATABASE();

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'users'
    AND index_name = 'idx_users_role_active'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_users_role_active ON users(role_id, is_active)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'quotations'
    AND index_name = 'idx_quotations_created_sent_status'
);
SET @has_sent_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @schema_name
    AND table_name = 'quotations'
    AND column_name = 'sent_at'
);
SET @sql = IF(
  @idx_exists = 0,
  IF(
    @has_sent_at = 1,
    'CREATE INDEX idx_quotations_created_sent_status ON quotations(created_at, sent_at, status)',
    'CREATE INDEX idx_quotations_created_sent_status ON quotations(created_at, status)'
  ),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'payments'
    AND index_name = 'idx_payments_created_booking_status'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_payments_created_booking_status ON payments(created_at, booking_id, status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'refunds'
    AND index_name = 'idx_refunds_created_booking_status'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_refunds_created_booking_status ON refunds(created_at, booking_id, status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'followups'
    AND index_name = 'idx_followups_created_user_lead'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_followups_created_user_lead ON followups(created_at, user_id, lead_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'visa_cases'
    AND index_name = 'idx_visa_cases_created_booking_status'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX idx_visa_cases_created_booking_status ON visa_cases(created_at, booking_id, status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
