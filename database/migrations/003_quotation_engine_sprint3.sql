-- SQL Server migration: quotation engine sprint 3

-- Expand allowed quotation statuses (SQL Server does not support enums).
IF OBJECT_ID(N'dbo.quotations', 'U') IS NOT NULL AND COL_LENGTH('dbo.quotations', 'status') IS NOT NULL
BEGIN
  DECLARE @ckDefinition NVARCHAR(MAX);

  SELECT @ckDefinition = cc.definition
  FROM sys.check_constraints cc
  WHERE cc.parent_object_id = OBJECT_ID(N'dbo.quotations')
    AND cc.name = 'CK_quotations_status';

  IF @ckDefinition IS NULL
  BEGIN
    ALTER TABLE dbo.quotations
      ADD CONSTRAINT CK_quotations_status CHECK (status IN ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED'));
  END
  ELSE IF @ckDefinition NOT LIKE '%VIEWED%' OR @ckDefinition NOT LIKE '%EXPIRED%'
  BEGIN
    ALTER TABLE dbo.quotations DROP CONSTRAINT CK_quotations_status;
    ALTER TABLE dbo.quotations
      ADD CONSTRAINT CK_quotations_status CHECK (status IN ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED'));
  END
END

IF OBJECT_ID(N'dbo.quotation_templates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.quotation_templates (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_quotation_templates PRIMARY KEY DEFAULT NEWID(),
    code NVARCHAR(50) NOT NULL CONSTRAINT UQ_quotation_templates_code UNIQUE,
    name NVARCHAR(150) NOT NULL,
    template_type NVARCHAR(40) NOT NULL CONSTRAINT CK_quotation_templates_type
      CHECK (template_type IN ('READY_PACKAGE', 'VISA', 'CUSTOM_ITINERARY')),
    header_branding NVARCHAR(MAX) NULL,
    inclusions NVARCHAR(MAX) NULL,
    exclusions NVARCHAR(MAX) NULL,
    payment_terms NVARCHAR(MAX) NULL,
    cancellation_policy NVARCHAR(MAX) NULL,
    footer_disclaimer NVARCHAR(MAX) NULL,
    min_margin_percent DECIMAL(5,2) NULL
      CONSTRAINT DF_quotation_templates_min_margin DEFAULT 0
      CONSTRAINT CK_quotation_templates_min_margin
        CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
    is_active BIT NULL CONSTRAINT DF_quotation_templates_is_active DEFAULT 1,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NULL CONSTRAINT DF_quotation_templates_created_at DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME2 NULL CONSTRAINT DF_quotation_templates_updated_at DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE dbo.quotation_templates
    ADD CONSTRAINT FK_quotation_templates_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id);
  ALTER TABLE dbo.quotation_templates
    ADD CONSTRAINT FK_quotation_templates_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id);
END

IF OBJECT_ID(N'dbo.quotations', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.quotations', 'template_id') IS NULL
  BEGIN
    ALTER TABLE dbo.quotations ADD template_id UNIQUEIDENTIFIER NULL;
    ALTER TABLE dbo.quotations
      ADD CONSTRAINT FK_quotations_template_id
      FOREIGN KEY (template_id) REFERENCES dbo.quotation_templates(id) ON DELETE SET NULL;
  END

  IF COL_LENGTH('dbo.quotations', 'template_snapshot') IS NULL
    ALTER TABLE dbo.quotations ADD template_snapshot NVARCHAR(MAX) NULL;

  IF COL_LENGTH('dbo.quotations', 'quote_number') IS NULL
    ALTER TABLE dbo.quotations ADD quote_number NVARCHAR(50) NULL;

  IF COL_LENGTH('dbo.quotations', 'margin_amount') IS NULL
    ALTER TABLE dbo.quotations
      ADD margin_amount DECIMAL(12,2) NULL
        CONSTRAINT DF_quotations_margin_amount DEFAULT 0
        CONSTRAINT CK_quotations_margin_amount CHECK (margin_amount >= 0);

  IF COL_LENGTH('dbo.quotations', 'discount_amount') IS NULL
    ALTER TABLE dbo.quotations
      ADD discount_amount DECIMAL(12,2) NULL
        CONSTRAINT DF_quotations_discount_amount DEFAULT 0
        CONSTRAINT CK_quotations_discount_amount CHECK (discount_amount >= 0);

  IF COL_LENGTH('dbo.quotations', 'tax_amount') IS NULL
    ALTER TABLE dbo.quotations
      ADD tax_amount DECIMAL(12,2) NULL
        CONSTRAINT DF_quotations_tax_amount DEFAULT 0
        CONSTRAINT CK_quotations_tax_amount CHECK (tax_amount >= 0);

  IF COL_LENGTH('dbo.quotations', 'min_margin_percent') IS NULL
    ALTER TABLE dbo.quotations
      ADD min_margin_percent DECIMAL(5,2) NULL
        CONSTRAINT DF_quotations_min_margin_percent DEFAULT 0
        CONSTRAINT CK_quotations_min_margin_percent
          CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100);

  IF COL_LENGTH('dbo.quotations', 'requires_approval') IS NULL
    ALTER TABLE dbo.quotations
      ADD requires_approval BIT NULL CONSTRAINT DF_quotations_requires_approval DEFAULT 0;

  IF COL_LENGTH('dbo.quotations', 'approved_by') IS NULL
  BEGIN
    ALTER TABLE dbo.quotations ADD approved_by UNIQUEIDENTIFIER NULL;
    ALTER TABLE dbo.quotations
      ADD CONSTRAINT FK_quotations_approved_by FOREIGN KEY (approved_by) REFERENCES dbo.users(id);
  END

  IF COL_LENGTH('dbo.quotations', 'approved_at') IS NULL
    ALTER TABLE dbo.quotations ADD approved_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.quotations', 'approval_note') IS NULL
    ALTER TABLE dbo.quotations ADD approval_note NVARCHAR(MAX) NULL;

  IF COL_LENGTH('dbo.quotations', 'sent_by') IS NULL
  BEGIN
    ALTER TABLE dbo.quotations ADD sent_by UNIQUEIDENTIFIER NULL;
    ALTER TABLE dbo.quotations
      ADD CONSTRAINT FK_quotations_sent_by FOREIGN KEY (sent_by) REFERENCES dbo.users(id);
  END

  IF COL_LENGTH('dbo.quotations', 'pdf_generated_at') IS NULL
    ALTER TABLE dbo.quotations ADD pdf_generated_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.quotations', 'pdf_generated_by') IS NULL
  BEGIN
    ALTER TABLE dbo.quotations ADD pdf_generated_by UNIQUEIDENTIFIER NULL;
    ALTER TABLE dbo.quotations
      ADD CONSTRAINT FK_quotations_pdf_generated_by FOREIGN KEY (pdf_generated_by) REFERENCES dbo.users(id);
  END

  IF COL_LENGTH('dbo.quotations', 'view_count') IS NULL
    ALTER TABLE dbo.quotations
      ADD view_count INT NULL CONSTRAINT DF_quotations_view_count DEFAULT 0;

  IF COL_LENGTH('dbo.quotations', 'first_viewed_at') IS NULL
    ALTER TABLE dbo.quotations ADD first_viewed_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.quotations', 'last_viewed_at') IS NULL
    ALTER TABLE dbo.quotations ADD last_viewed_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.quotations', 'expires_at') IS NULL
    ALTER TABLE dbo.quotations ADD expires_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.quotations', 'locked_at') IS NULL
    ALTER TABLE dbo.quotations ADD locked_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.quotations', 'lead_to_quote_minutes') IS NULL
    ALTER TABLE dbo.quotations ADD lead_to_quote_minutes INT NULL;

  IF COL_LENGTH('dbo.quotations', 'updated_at') IS NULL
    ALTER TABLE dbo.quotations
      ADD updated_at DATETIME2 NULL CONSTRAINT DF_quotations_updated_at DEFAULT CURRENT_TIMESTAMP;
END

IF OBJECT_ID(N'dbo.quotations', 'U') IS NOT NULL AND COL_LENGTH('dbo.quotations', 'view_count') IS NOT NULL
BEGIN
  UPDATE dbo.quotations
  SET view_count = 0
  WHERE view_count IS NULL;
END

IF OBJECT_ID(N'dbo.quotation_version_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.quotation_version_logs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_quotation_version_logs PRIMARY KEY DEFAULT NEWID(),
    quotation_id UNIQUEIDENTIFIER NOT NULL,
    version_number INT NOT NULL,
    editor_id UNIQUEIDENTIFIER NULL,
    action NVARCHAR(60) NOT NULL,
    change_log NVARCHAR(MAX) NULL,
    snapshot NVARCHAR(MAX) NULL,
    created_at DATETIME2 NULL CONSTRAINT DF_quotation_version_logs_created_at DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE dbo.quotation_version_logs
    ADD CONSTRAINT FK_quotation_version_logs_quotation_id
    FOREIGN KEY (quotation_id) REFERENCES dbo.quotations(id) ON DELETE CASCADE;
  ALTER TABLE dbo.quotation_version_logs
    ADD CONSTRAINT FK_quotation_version_logs_editor_id
    FOREIGN KEY (editor_id) REFERENCES dbo.users(id);
END

IF OBJECT_ID(N'dbo.quotation_send_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.quotation_send_logs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_quotation_send_logs PRIMARY KEY DEFAULT NEWID(),
    quotation_id UNIQUEIDENTIFIER NOT NULL,
    sent_by UNIQUEIDENTIFIER NULL,
    delivery_channel NVARCHAR(30) NULL CONSTRAINT DF_quotation_send_logs_delivery_channel DEFAULT 'MANUAL',
    recipient_email NVARCHAR(150) NULL,
    recipient_phone NVARCHAR(25) NULL,
    sent_at DATETIME2 NULL CONSTRAINT DF_quotation_send_logs_sent_at DEFAULT CURRENT_TIMESTAMP,
    metadata NVARCHAR(MAX) NULL
  );

  ALTER TABLE dbo.quotation_send_logs
    ADD CONSTRAINT FK_quotation_send_logs_quotation_id
    FOREIGN KEY (quotation_id) REFERENCES dbo.quotations(id) ON DELETE CASCADE;
  ALTER TABLE dbo.quotation_send_logs
    ADD CONSTRAINT FK_quotation_send_logs_sent_by
    FOREIGN KEY (sent_by) REFERENCES dbo.users(id);
END

IF OBJECT_ID(N'dbo.quotation_reminder_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.quotation_reminder_logs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_quotation_reminder_logs PRIMARY KEY DEFAULT NEWID(),
    quotation_id UNIQUEIDENTIFIER NOT NULL,
    reminder_type NVARCHAR(60) NOT NULL,
    triggered_by UNIQUEIDENTIFIER NULL,
    triggered_at DATETIME2 NULL CONSTRAINT DF_quotation_reminder_logs_triggered_at DEFAULT CURRENT_TIMESTAMP,
    metadata NVARCHAR(MAX) NULL
  );

  ALTER TABLE dbo.quotation_reminder_logs
    ADD CONSTRAINT FK_quotation_reminder_logs_quotation_id
    FOREIGN KEY (quotation_id) REFERENCES dbo.quotations(id) ON DELETE CASCADE;
  ALTER TABLE dbo.quotation_reminder_logs
    ADD CONSTRAINT FK_quotation_reminder_logs_triggered_by
    FOREIGN KEY (triggered_by) REFERENCES dbo.users(id);
END

IF OBJECT_ID(N'dbo.quotation_views', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.quotation_views', 'device_info') IS NULL
    ALTER TABLE dbo.quotation_views ADD device_info NVARCHAR(MAX) NULL;

  IF COL_LENGTH('dbo.quotation_views', 'user_agent') IS NULL
    ALTER TABLE dbo.quotation_views ADD user_agent NVARCHAR(MAX) NULL;
END

IF OBJECT_ID(N'dbo.quotations', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'uq_quotations_quote_number'
      AND object_id = OBJECT_ID(N'dbo.quotations')
  )
    CREATE UNIQUE INDEX uq_quotations_quote_number ON dbo.quotations (quote_number)
    WHERE quote_number IS NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotations_template_id'
      AND object_id = OBJECT_ID(N'dbo.quotations')
  )
    CREATE INDEX idx_quotations_template_id ON dbo.quotations (template_id);

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotations_requires_approval'
      AND object_id = OBJECT_ID(N'dbo.quotations')
  )
    CREATE INDEX idx_quotations_requires_approval ON dbo.quotations (requires_approval);

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotations_status_expires'
      AND object_id = OBJECT_ID(N'dbo.quotations')
  )
    CREATE INDEX idx_quotations_status_expires ON dbo.quotations (status, expires_at);
END

IF OBJECT_ID(N'dbo.quotation_version_logs', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotation_version_logs_quote'
      AND object_id = OBJECT_ID(N'dbo.quotation_version_logs')
  )
    CREATE INDEX idx_quotation_version_logs_quote
      ON dbo.quotation_version_logs (quotation_id, version_number DESC);
END

IF OBJECT_ID(N'dbo.quotation_send_logs', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotation_send_logs_quote_sent_at'
      AND object_id = OBJECT_ID(N'dbo.quotation_send_logs')
  )
    CREATE INDEX idx_quotation_send_logs_quote_sent_at
      ON dbo.quotation_send_logs (quotation_id, sent_at DESC);
END

IF OBJECT_ID(N'dbo.quotation_reminder_logs', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotation_reminders_quote_type'
      AND object_id = OBJECT_ID(N'dbo.quotation_reminder_logs')
  )
    CREATE INDEX idx_quotation_reminders_quote_type
      ON dbo.quotation_reminder_logs (quotation_id, reminder_type);
END

IF OBJECT_ID(N'dbo.quotation_views', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotation_views_quote_viewed'
      AND object_id = OBJECT_ID(N'dbo.quotation_views')
  )
    CREATE INDEX idx_quotation_views_quote_viewed
      ON dbo.quotation_views (quotation_id, viewed_at DESC);
END

IF OBJECT_ID(N'dbo.quotation_templates', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_quotation_templates_active_type'
      AND object_id = OBJECT_ID(N'dbo.quotation_templates')
  )
    CREATE INDEX idx_quotation_templates_active_type
      ON dbo.quotation_templates (is_active, template_type);
END
