-- Persist WhatsApp Cloud API messages per lead for CRM inbox UI.
CREATE TABLE IF NOT EXISTS whatsapp_conversation_messages (
  id CHAR(36) NOT NULL,
  lead_id CHAR(36) NOT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  body TEXT,
  wa_message_id VARCHAR(128) DEFAULT NULL,
  phone_number_id VARCHAR(64) DEFAULT NULL,
  display_phone_number VARCHAR(64) DEFAULT NULL,
  peer_phone VARCHAR(32) NOT NULL,
  wa_timestamp_ms BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_whatsapp_conv_wa_message_id (wa_message_id),
  KEY idx_whatsapp_conv_lead_created (lead_id, created_at),
  KEY idx_whatsapp_conv_phone_number (phone_number_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
