const fs = require('fs');
const path = require('path');

const files = [
  'crm/modules/leads/leads.repository.js',
  'crm/modules/bookings/bookings.repository.js',
  'crm/modules/dashboard/dashboard.repository.js',
  'crm/modules/suppliers/suppliers.repository.js',
  'crm/modules/quotations/quotations.repository.js',
  'crm/modules/payments/payments.repository.js',
  'crm/modules/reports/reports.repository.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix broken IN (? syntax back to proper array handling
  // This requires manual inspection but we can fix obvious patterns
  content = content.replace(/WHERE id = IN \(\?\)/g, 'WHERE id IN (?)');
  content = content.replace(/= IN \(\?\)/g, 'IN (?)');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed IN clause in ${file}`);
});

console.log('Done fixing IN clauses!');
