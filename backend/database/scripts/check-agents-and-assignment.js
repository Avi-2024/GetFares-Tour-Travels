import { createApp } from "../../src/app.js";

async function main() {
  const appInstance = createApp();
  const { container } = appInstance;
  const db = container.db;

  const agentsRes = await db.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.agent_country,
        u.agent_type,
        r.name AS role_name,
        u.is_active,
        COALESCE(u.is_on_leave, 0) AS is_on_leave
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.is_active = 1
        AND COALESCE(u.is_on_leave, 0) = 0
        AND r.name IN ('agent','sales_consultant','visa_executive','holiday_consultant')
      ORDER BY u.agent_country, r.name, u.full_name
    `,
  );

  const agents = Array.isArray(agentsRes?.rows) ? agentsRes.rows : [];

  const loadRes = await db.query(
    `
      SELECT assigned_to, COUNT(*) AS open_count
      FROM leads
      WHERE status = 'OPEN' AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    `,
  );
  const loads = Array.isArray(loadRes?.rows) ? loadRes.rows : [];
  const loadById = new Map(loads.map((r) => [String(r.assigned_to), Number(r.open_count || 0)]));

  const output = agents.map((a) => ({
    id: a.id,
    name: a.full_name,
    email: a.email,
    role: a.role_name,
    country: a.agent_country,
    agentType: a.agent_type,
    openLeads: loadById.get(String(a.id)) || 0,
  }));

  console.log(JSON.stringify({ activeAgents: output.length, output }, null, 2));

  if (appInstance?.container?.db?.pool) {
    await appInstance.container.db.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

