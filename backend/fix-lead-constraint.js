import { createDatabaseConnection } from './crm/core/database/connection.js';
import { createLogger } from './crm/core/logger/index.js';
import { config } from './crm/core/config/index.js';

const logger = createLogger({ service: 'fix-lead-constraint' });

async function fixConstraint() {
  const db = await createDatabaseConnection({ logger, config });

  try {
    await db.query('ALTER TABLE leads DROP CONSTRAINT chk_leads_lead_code_format');
    logger.info('Constraint dropped');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Failed');
    process.exit(1);
  }
}

fixConstraint();
