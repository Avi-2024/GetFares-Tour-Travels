const fs = require('fs');
const path = require('path');

const files = [
  'crm/modules/leads/leads.repository.js',
  'crm/modules/bookings/bookings.repository.js',
  'crm/modules/dashboard/dashboard.repository.js',
  'crm/modules/suppliers/suppliers.repository.js',
  'crm/modules/users/users.repository.js',
  'crm/modules/countries/countries.repository.js',
  'crm/modules/quotations/quotations.repository.js',
  'crm/modules/payments/payments.repository.js',
  'crm/modules/visa/visa.repository.js',
  'crm/modules/reports/reports.repository.js',
  'crm/modules/refunds/refunds.repository.js',
  'crm/modules/notifications/notifications.repository.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace PostgreSQL placeholders
  content = content.replace(/\$1/g, '?');
  content = content.replace(/\$2/g, '?');
  content = content.replace(/\$3/g, '?');
  content = content.replace(/\$4/g, '?');
  content = content.replace(/\$5/g, '?');
  content = content.replace(/\$6/g, '?');
  content = content.replace(/\$7/g, '?');
  content = content.replace(/\$8/g, '?');
  content = content.replace(/\$9/g, '?');
  
  // Remove type casting
  content = content.replace(/::text\[\]/g, '');
  content = content.replace(/::uuid\[\]/g, '');
  content = content.replace(/::text/g, '');
  content = content.replace(/::uuid/g, '');
  content = content.replace(/::int/g, '');
  content = content.replace(/::date/g, '');
  content = content.replace(/::bigint/g, '');
  
  // Fix ANY array syntax
  content = content.replace(/ANY\(\?/g, 'IN (?');
  
  // Remove postgres adapter checks
  content = content.replace(/postgres\" \|\| db\.adapter === \"mysql/g, 'mysql');
  content = content.replace(/db\.adapter === \"postgres\" \|\| db\.adapter === \"mysql\"/g, 'db.adapter === "mysql"');
  content = content.replace(/db\.adapter !== \"postgres\" && db\.adapter !== \"mysql\"/g, 'db.adapter !== "mysql"');
  content = content.replace(/adapter === 'postgres' \|\| adapter === 'mysql'/g, "adapter === 'mysql'");
  content = content.replace(/adapter === \"postgres\"/g, 'adapter === "mysql"');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});

console.log('Done!');
