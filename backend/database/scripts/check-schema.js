import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='leads' 
    ORDER BY ordinal_position
  `);
  
  console.log('Leads table columns:');
  result.rows.forEach(c => console.log('-', c.column_name));
  
  await pool.end();
}

checkSchema();
