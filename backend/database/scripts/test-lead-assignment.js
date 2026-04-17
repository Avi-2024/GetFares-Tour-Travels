import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function testLeadAssignment() {
  console.log('\n🔍 Testing Lead Assignment Logic\n');
  console.log('='.repeat(80));

  try {
    // 1. Check all leads
    const leadsResult = await pool.query(`
      SELECT 
        l.id,
        l.full_name,
        l.lead_type,
        l.lead_country,
        d.name as destination_name,
        l.assigned_to,
        l.status,
        l.created_at,
        u.full_name as assigned_user_name,
        u.country as assigned_user_country,
        u.agent_type as assigned_user_type
      FROM leads l
      LEFT JOIN destinations d ON l.destination_id = d.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.is_deleted = false
      ORDER BY l.created_at DESC
      LIMIT 20
    `);

    console.log(`\n📋 Total Leads: ${leadsResult.rows.length}\n`);

    // 2. Check active agents
    const agentsResult = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.country,
        u.agent_type,
        u.is_active,
        u.is_on_leave,
        u.active as active_status,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = true 
        AND u.is_on_leave = false
        AND u.last_login IS NOT NULL
        AND r.name IN ('agent', 'sales_consultant', 'visa_executive', 'holiday_consultant')
      ORDER BY u.country, u.agent_type
    `);

    console.log(`\n👥 Active Agents: ${agentsResult.rows.length}\n`);

    // Display agents
    console.log('Agent Details:');
    console.log('-'.repeat(80));
    agentsResult.rows.forEach(agent => {
      console.log(`  ${agent.full_name.padEnd(25)} | Country: ${(agent.country || 'NULL').padEnd(15)} | Type: ${(agent.agent_type || 'NULL').padEnd(10)} | Role: ${agent.role_name}`);
    });

    // 3. Analyze assignment status
    console.log('\n\n📊 Lead Assignment Analysis:\n');
    console.log('-'.repeat(80));

    const unassignedLeads = [];
    const assignedLeads = [];

    for (const lead of leadsResult.rows) {
      const status = lead.assigned_to ? '✅ ASSIGNED' : '❌ UNASSIGNED';
      const leadCountry = lead.lead_country || 'NULL';
      const leadType = lead.lead_type || 'NULL';
      
      console.log(`\n${status} | ${lead.full_name}`);
      console.log(`  Lead Type: ${leadType} | Country: ${leadCountry} | Destination: ${lead.destination_name || 'N/A'}`);
      
      if (lead.assigned_to) {
        const agent = agentsResult.rows.find(a => a.id === lead.assigned_to);
        if (agent) {
          console.log(`  Assigned To: ${agent.full_name} (Country: ${agent.country || 'NULL'}, Type: ${agent.agent_type || 'NULL'})`);
        } else {
          console.log(`  Assigned To: ${lead.assigned_to} (Agent not found in active list)`);
        }
        assignedLeads.push(lead);
      } else {
        // Find matching agents
        const matchingAgents = agentsResult.rows.filter(agent => {
          const agentCountry = agent.country?.toLowerCase();
          const agentType = agent.agent_type?.toUpperCase();
          const reqLeadType = leadType?.toUpperCase();
          
          // Type must match
          if (reqLeadType && reqLeadType !== 'BOTH') {
            if (!agentType || (agentType !== reqLeadType && agentType !== 'BOTH')) {
              return false;
            }
          }
          
          // Perfect match: country + type
          if (leadCountry && leadCountry !== 'NULL' && agentCountry) {
            return agentCountry === leadCountry.toLowerCase();
          }
          
          // Type-only match: agent has no country
          return !agentCountry;
        });
        
        console.log(`  Matching Agents: ${matchingAgents.length}`);
        if (matchingAgents.length > 0) {
          matchingAgents.forEach(agent => {
            console.log(`    - ${agent.full_name} (Country: ${agent.country || 'NULL'}, Type: ${agent.agent_type || 'NULL'})`);
          });
        } else {
          console.log(`    ⚠️  NO MATCHING AGENTS FOUND!`);
        }
        
        unassignedLeads.push(lead);
      }
    }

    // 4. Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('\n📈 SUMMARY:\n');
    console.log(`  Total Leads: ${leadsResult.rows.length}`);
    console.log(`  Assigned: ${assignedLeads.length} (${((assignedLeads.length / leadsResult.rows.length) * 100).toFixed(1)}%)`);
    console.log(`  Unassigned: ${unassignedLeads.length} (${((unassignedLeads.length / leadsResult.rows.length) * 100).toFixed(1)}%)`);
    console.log(`  Active Agents: ${agentsResult.rows.length}`);

    // 5. Check for issues
    console.log('\n\n🔧 POTENTIAL ISSUES:\n');
    
    if (unassignedLeads.length > 0) {
      console.log(`  ⚠️  ${unassignedLeads.length} leads are unassigned`);
      
      // Check if there are agents available
      if (agentsResult.rows.length === 0) {
        console.log(`  ❌ NO ACTIVE AGENTS AVAILABLE!`);
        console.log(`     - Check if agents have is_active = true`);
        console.log(`     - Check if agents have is_on_leave = false`);
        console.log(`     - Check if agents have last_login set`);
      } else {
        // Check for type mismatches
        const typeIssues = unassignedLeads.filter(lead => {
          const leadType = lead.lead_type?.toUpperCase();
          const hasMatchingType = agentsResult.rows.some(agent => {
            const agentType = agent.agent_type?.toUpperCase();
            return agentType === leadType || agentType === 'BOTH';
          });
          return !hasMatchingType;
        });
        
        if (typeIssues.length > 0) {
          console.log(`  ❌ ${typeIssues.length} leads have no agents with matching type:`);
          typeIssues.forEach(lead => {
            console.log(`     - ${lead.full_name}: Type=${lead.lead_type}, needs agent with type=${lead.lead_type} or BOTH`);
          });
        }
        
        // Check for country restrictions
        const countryIssues = unassignedLeads.filter(lead => {
          const leadCountry = lead.lead_country?.toLowerCase();
          const leadType = lead.lead_type?.toUpperCase();
          
          if (!leadCountry || leadCountry === 'null') {
            // Lead has no country, check if there are agents with no country
            const hasFlexibleAgent = agentsResult.rows.some(agent => {
              const agentType = agent.agent_type?.toUpperCase();
              const typeMatches = agentType === leadType || agentType === 'BOTH';
              return !agent.country && typeMatches;
            });
            return !hasFlexibleAgent;
          }
          
          return false;
        });
        
        if (countryIssues.length > 0) {
          console.log(`  ❌ ${countryIssues.length} leads need agents with NO country restriction:`);
          countryIssues.forEach(lead => {
            console.log(`     - ${lead.full_name}: Type=${lead.lead_type}, needs agent with country=NULL and type=${lead.lead_type}`);
          });
        }
      }
    } else {
      console.log(`  ✅ All leads are assigned!`);
    }

    // 6. Check queued leads
    const queuedResult = await pool.query(`
      SELECT 
        lq.id,
        lq.lead_id,
        lq.reason,
        lq.queued_at,
        lq.processed_at,
        l.full_name,
        l.lead_type,
        l.lead_country
      FROM lead_queue lq
      LEFT JOIN leads l ON lq.lead_id = l.id
      WHERE lq.processed_at IS NULL
      ORDER BY lq.queued_at DESC
      LIMIT 10
    `);

    if (queuedResult.rows.length > 0) {
      console.log(`\n\n📥 QUEUED LEADS: ${queuedResult.rows.length}\n`);
      queuedResult.rows.forEach(q => {
        console.log(`  - ${q.full_name || 'Unknown'} (Type: ${q.lead_type || 'N/A'}, Country: ${q.lead_country || 'NULL'})`);
        console.log(`    Reason: ${q.reason}`);
        console.log(`    Queued: ${q.queued_at}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testLeadAssignment();
