import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkAssignmentStats() {
  console.log('\n📊 Lead Assignment Statistics\n');
  console.log('='.repeat(60));

  try {
    // Total leads
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total FROM leads WHERE is_deleted = false
    `);
    
    // Assigned leads
    const assignedResult = await pool.query(`
      SELECT COUNT(*) as assigned 
      FROM leads 
      WHERE is_deleted = false AND assigned_to IS NOT NULL
    `);
    
    // Unassigned leads
    const unassignedResult = await pool.query(`
      SELECT COUNT(*) as unassigned 
      FROM leads 
      WHERE is_deleted = false AND assigned_to IS NULL
    `);
    
    // Active agents
    const agentsResult = await pool.query(`
      SELECT COUNT(*) as active_agents
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = true 
        AND u.is_on_leave = false
        AND u.last_login IS NOT NULL
        AND r.name IN ('agent', 'sales_consultant', 'visa_executive', 'holiday_consultant')
    `);
    
    // Agents by type
    const agentsByTypeResult = await pool.query(`
      SELECT 
        COALESCE(u.agent_type, 'NULL') as agent_type,
        COALESCE(u.agent_country, 'NULL') as country,
        COUNT(*) as count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = true 
        AND u.is_on_leave = false
        AND u.last_login IS NOT NULL
        AND r.name IN ('agent', 'sales_consultant', 'visa_executive', 'holiday_consultant')
      GROUP BY u.agent_type, u.agent_country
      ORDER BY u.agent_country, u.agent_type
    `);
    
    // Leads by type
    const leadsByTypeResult = await pool.query(`
      SELECT 
        COALESCE(lead_type, 'NULL') as lead_type,
        COALESCE(lead_country, 'NULL') as lead_country,
        COUNT(*) as count,
        SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as assigned_count
      FROM leads
      WHERE is_deleted = false
      GROUP BY lead_type, lead_country
      ORDER BY lead_type, lead_country
    `);

    const total = parseInt(totalResult.rows[0].total);
    const assigned = parseInt(assignedResult.rows[0].assigned);
    const unassigned = parseInt(unassignedResult.rows[0].unassigned);
    const activeAgents = parseInt(agentsResult.rows[0].active_agents);

    console.log(`\n📈 Overall Stats:`);
    console.log(`  Total Leads: ${total}`);
    console.log(`  Assigned: ${assigned} (${((assigned/total)*100).toFixed(1)}%)`);
    console.log(`  Unassigned: ${unassigned} (${((unassigned/total)*100).toFixed(1)}%)`);
    console.log(`  Active Agents: ${activeAgents}`);

    console.log(`\n\n👥 Agents by Type & Country:`);
    console.log('-'.repeat(60));
    agentsByTypeResult.rows.forEach(row => {
      console.log(`  ${row.agent_type.padEnd(15)} | Country: ${row.country.padEnd(15)} | Count: ${row.count}`);
    });

    console.log(`\n\n📋 Leads by Type & Country:`);
    console.log('-'.repeat(60));
    leadsByTypeResult.rows.forEach(row => {
      const assignRate = row.count > 0 ? ((row.assigned_count/row.count)*100).toFixed(1) : '0.0';
      console.log(`  Type: ${row.lead_type.padEnd(10)} | Country: ${row.lead_country.padEnd(15)} | Total: ${row.count.toString().padStart(3)} | Assigned: ${row.assigned_count.toString().padStart(3)} (${assignRate}%)`);
    });

    // Check for issues
    console.log(`\n\n🔍 Potential Issues:`);
    console.log('-'.repeat(60));
    
    if (activeAgents === 0) {
      console.log(`  ❌ NO ACTIVE AGENTS! Check:`);
      console.log(`     - is_active = true`);
      console.log(`     - is_on_leave = false`);
      console.log(`     - last_login IS NOT NULL`);
      console.log(`     - role in (agent, sales_consultant, visa_executive, holiday_consultant)`);
    } else if (unassigned > 0) {
      console.log(`  ⚠️  ${unassigned} leads are unassigned`);
      
      // Check for type mismatches
      for (const lead of leadsByTypeResult.rows) {
        if (lead.assigned_count < lead.count) {
          const leadType = lead.lead_type;
          const hasMatchingAgent = agentsByTypeResult.rows.some(agent => 
            agent.agent_type === leadType || agent.agent_type === 'BOTH'
          );
          
          if (!hasMatchingAgent) {
            console.log(`  ❌ No agents for lead type: ${leadType}`);
          }
        }
      }
    } else {
      console.log(`  ✅ All leads are assigned!`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAssignmentStats();
