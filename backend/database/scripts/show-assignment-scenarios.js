import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function showAssignmentScenarios() {
  console.log('\n🎯 Lead Assignment Scenarios\n');
  console.log('='.repeat(80));

  try {
    // Get all leads with details
    const leadsResult = await pool.query(`
      SELECT 
        l.id,
        l.full_name,
        l.lead_type,
        l.lead_country,
        l.assigned_to,
        u.full_name as agent_name,
        u.agent_type,
        u.agent_country
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.is_deleted = false
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    console.log(`\n📋 Recent Leads (${leadsResult.rows.length}):\n`);
    console.log('-'.repeat(80));

    leadsResult.rows.forEach((lead, index) => {
      const status = lead.assigned_to ? '✅' : '❌';
      console.log(`\n${index + 1}. ${status} ${lead.full_name}`);
      console.log(`   Lead: Type=${lead.lead_type || 'NULL'}, Country=${lead.lead_country || 'NULL'}`);
      if (lead.assigned_to) {
        console.log(`   Agent: ${lead.agent_name} (Type=${lead.agent_type || 'NULL'}, Country=${lead.agent_country || 'NULL'})`);
        
        // Determine match tier
        const leadType = lead.lead_type?.toUpperCase();
        const leadCountry = lead.lead_country?.toLowerCase();
        const agentType = lead.agent_type?.toUpperCase();
        const agentCountry = lead.agent_country?.toLowerCase();
        
        let tier = 'UNKNOWN';
        if (leadCountry && agentCountry && leadCountry === agentCountry && 
            leadType && agentType && (agentType === leadType || agentType === 'BOTH')) {
          tier = '🎯 PERFECT (Country + Type)';
        } else if (!agentCountry && leadType && agentType && (agentType === leadType || agentType === 'BOTH')) {
          tier = '✨ TYPE_ONLY (No country restriction)';
        } else if (!agentType || agentType === 'NULL') {
          tier = '🔄 FALLBACK (Agent accepts all types)';
        }
        
        console.log(`   Match: ${tier}`);
      }
    });

    console.log('\n\n' + '='.repeat(80));
    console.log('\n📚 Assignment Logic Summary:\n');
    console.log('  Tier 1 - PERFECT: Country matches AND Type matches');
    console.log('  Tier 2 - TYPE_ONLY: Type matches AND Agent has NO country restriction');
    console.log('  Fallback: Agent with NULL type accepts all leads');
    
    console.log('\n\n💡 Test Scenarios:\n');
    console.log('  1. Create lead with country="India" + type="VISA"');
    console.log('     → Needs agent with country="India" + type="VISA" or "BOTH"');
    console.log('     → Falls back to agent with country=NULL + type="VISA" or "BOTH"');
    console.log('');
    console.log('  2. Create lead with country=NULL + type="HOLIDAY"');
    console.log('     → Needs agent with country=NULL + type="HOLIDAY" or "BOTH"');
    console.log('');
    console.log('  3. Create lead with country="UAE" + type="VISA"');
    console.log('     → Needs agent with country="UAE" + type="VISA" or "BOTH"');
    console.log('     → Falls back to agent with country=NULL + type="VISA" or "BOTH"');

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

showAssignmentScenarios();
