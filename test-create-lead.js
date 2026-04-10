import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/crm/leads';

// Test lead data - Holiday package with full details
const testLead = {
  fullName: "Rajesh Kumar",
  phone: "+919876543210",
  email: "rajesh.kumar@example.com",
  nationality: "Indian",
  leadCountry: "India",
  destination: "Maldives",
  travelDate: "2024-06-15",
  travelEndDate: "2024-06-22",
  adultsCount: 2,
  childrenCount: 1,
  childAges: [8],
  budget: 250000,
  leadType: "HOLIDAY",
  preferredHotelCategory: "5_STAR",
  travelPurpose: "Leisure",
  visaRequired: false,
  source: "Website",
  notes: "Family vacation - interested in water sports and spa",
  autoAssign: true
};

async function createLead() {
  try {
    console.log('Creating test lead...\n');
    console.log('Payload:', JSON.stringify(testLead, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLead)
    });

    const data = await response.json();
    
    console.log('\n--- Response ---');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.data) {
      console.log('\n✓ Lead created successfully!');
      console.log('Lead ID:', data.data.id);
      console.log('Lead Code:', data.data.leadCode);
      
      // Now fetch the lead to verify
      console.log('\n--- Fetching created lead ---');
      const fetchResponse = await fetch(`${API_URL}/${data.data.id}`);
      const fetchData = await fetchResponse.json();
      console.log('Fetched lead:', JSON.stringify(fetchData, null, 2));
    } else {
      console.error('\n✗ Failed to create lead');
      console.error('Error:', data.error || data.message);
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createLead();
