CREATE TABLE IF NOT EXISTS currency_rates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  base_currency VARCHAR(10) NOT NULL,
  rates JSON NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_currency_rates_base_currency (base_currency),
  KEY idx_currency_rates_updated_at (updated_at)
);
