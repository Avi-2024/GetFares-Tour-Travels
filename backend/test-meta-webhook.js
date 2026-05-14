#!/usr/bin/env node

/**
 * Meta Webhook Configuration Test Script
 * 
 * This script tests your Meta webhook configuration without needing
 * to submit actual leads through Meta.
 * 
 * Usage: node test-meta-webhook.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('\n🔍 Meta Webhook Configuration Test\n');
console.log('='.repeat(60));

let hasErrors = false;

// Test 1: Check common Meta configuration
console.log('\n📋 Test 1: Common Meta Configuration');
console.log('-'.repeat(60));

const commonConfig = {
  'META_GRAPH_BASE_URL': process.env.META_GRAPH_BASE_URL,
  'META_GRAPH_VERSION': process.env.META_GRAPH_VERSION,
  'META_GRAPH_FIELDS': process.env.META_GRAPH_FIELDS,
  'META_ALLOW_INSECURE_WEBHOOKS': process.env.META_ALLOW_INSECURE_WEBHOOKS,
};

for (const [key, value] of Object.entries(commonConfig)) {
  if (value) {
    console.log(`✅ ${key}: ${value}`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
    hasErrors = true;
  }
}

// Test 2: Check India configuration
console.log('\n📋 Test 2: India Page Configuration');
console.log('-'.repeat(60));

const indiaConfig = {
  'META_INDIA_PAGE_ID': process.env.META_INDIA_PAGE_ID,
  'META_INDIA_PAGE_NAME': process.env.META_INDIA_PAGE_NAME,
  'META_INDIA_COUNTRY_CODE': process.env.META_INDIA_COUNTRY_CODE,
  'META_INDIA_COUNTRY_NAME': process.env.META_INDIA_COUNTRY_NAME,
  'META_INDIA_SOURCE_LABEL': process.env.META_INDIA_SOURCE_LABEL,
  'META_INDIA_ACCESS_TOKEN': process.env.META_INDIA_ACCESS_TOKEN ? '[CONFIGURED]' : null,
  'META_INDIA_APP_SECRET': process.env.META_INDIA_APP_SECRET ? '[CONFIGURED]' : null,
  'META_INDIA_VERIFY_TOKEN': process.env.META_INDIA_VERIFY_TOKEN ? '[CONFIGURED]' : null,
};

for (const [key, value] of Object.entries(indiaConfig)) {
  if (value) {
    console.log(`✅ ${key}: ${value}`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
    if (key.includes('PAGE_ID') || key.includes('TOKEN')) {
      hasErrors = true;
    }
  }
}

// Test 3: Check UAE configuration
console.log('\n📋 Test 3: UAE Page Configuration');
console.log('-'.repeat(60));

const uaeConfig = {
  'META_UAE_PAGE_ID': process.env.META_UAE_PAGE_ID,
  'META_UAE_PAGE_NAME': process.env.META_UAE_PAGE_NAME,
  'META_UAE_COUNTRY_CODE': process.env.META_UAE_COUNTRY_CODE,
  'META_UAE_COUNTRY_NAME': process.env.META_UAE_COUNTRY_NAME,
  'META_UAE_SOURCE_LABEL': process.env.META_UAE_SOURCE_LABEL,
  'META_UAE_ACCESS_TOKEN': process.env.META_UAE_ACCESS_TOKEN ? '[CONFIGURED]' : null,
  'META_UAE_APP_SECRET': process.env.META_UAE_APP_SECRET ? '[CONFIGURED]' : null,
  'META_UAE_VERIFY_TOKEN': process.env.META_UAE_VERIFY_TOKEN ? '[CONFIGURED]' : null,
};

for (const [key, value] of Object.entries(uaeConfig)) {
  if (value) {
    console.log(`✅ ${key}: ${value}`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
    if (key.includes('PAGE_ID') || key.includes('TOKEN')) {
      hasErrors = true;
    }
  }
}

// Test 4: Validate configuration
console.log('\n📋 Test 4: Configuration Validation');
console.log('-'.repeat(60));

// Check if page IDs are numeric
const indiaPageId = process.env.META_INDIA_PAGE_ID;
const uaePageId = process.env.META_UAE_PAGE_ID;

if (indiaPageId && /^\d+$/.test(indiaPageId)) {
  console.log(`✅ India Page ID is valid: ${indiaPageId}`);
} else {
  console.log(`❌ India Page ID is invalid or missing`);
  hasErrors = true;
}

if (uaePageId && /^\d+$/.test(uaePageId)) {
  console.log(`✅ UAE Page ID is valid: ${uaePageId}`);
} else {
  console.log(`❌ UAE Page ID is invalid or missing`);
  hasErrors = true;
}

// Check if access tokens look valid (should start with EAA)
const indiaToken = process.env.META_INDIA_ACCESS_TOKEN;
const uaeToken = process.env.META_UAE_ACCESS_TOKEN;

if (indiaToken && indiaToken.startsWith('EAA')) {
  console.log(`✅ India Access Token format looks valid`);
} else {
  console.log(`❌ India Access Token is invalid or missing`);
  hasErrors = true;
}

if (uaeToken && uaeToken.startsWith('EAA')) {
  console.log(`✅ UAE Access Token format looks valid`);
} else {
  console.log(`❌ UAE Access Token is invalid or missing`);
  hasErrors = true;
}

// Check if verify tokens are set and not default
const indiaVerifyToken = process.env.META_INDIA_VERIFY_TOKEN;
const uaeVerifyToken = process.env.META_UAE_VERIFY_TOKEN;

if (indiaVerifyToken && indiaVerifyToken.length > 10) {
  console.log(`✅ India Verify Token is set`);
} else {
  console.log(`❌ India Verify Token is too short or missing`);
  hasErrors = true;
}

if (uaeVerifyToken && uaeVerifyToken.length > 10) {
  console.log(`✅ UAE Verify Token is set`);
} else {
  console.log(`❌ UAE Verify Token is too short or missing`);
  hasErrors = true;
}

// Test 5: Check database configuration
console.log('\n📋 Test 5: Database Configuration');
console.log('-'.repeat(60));

const dbConfig = {
  'MYSQL_HOST': process.env.MYSQL_HOST,
  'MYSQL_PORT': process.env.MYSQL_PORT || '3306',
  'MYSQL_USER': process.env.MYSQL_USER,
  'MYSQL_PASSWORD': process.env.MYSQL_PASSWORD ? '[CONFIGURED]' : null,
  'MYSQL_DATABASE': process.env.MYSQL_DATABASE,
};

for (const [key, value] of Object.entries(dbConfig)) {
  if (value) {
    console.log(`✅ ${key}: ${value}`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
    hasErrors = true;
  }
}

// Test 6: Generate test URLs
console.log('\n📋 Test 6: Test URLs');
console.log('-'.repeat(60));

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;

console.log(`\n🔗 Webhook URL: ${baseUrl}/webhook/meta`);
console.log(`\n📝 Test verification with cURL:`);
console.log(`\ncurl "${baseUrl}/webhook/meta?hub.mode=subscribe&hub.verify_token=${indiaVerifyToken || 'YOUR_TOKEN'}&hub.challenge=test123"`);

console.log(`\n📝 Test webhook POST with cURL:`);
console.log(`\ncurl -X POST ${baseUrl}/webhook/meta \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"object":"page","entry":[{"id":"${indiaPageId || 'PAGE_ID'}","changes":[{"field":"leadgen","value":{"leadgen_id":"test123","page_id":"${indiaPageId || 'PAGE_ID'}"}}]}]}'`);

// Final summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('\n❌ Configuration has errors! Please fix the issues above.\n');
  console.log('📖 See META_WEBHOOK_DEBUG_GUIDE.md for help\n');
  process.exit(1);
} else {
  console.log('\n✅ Configuration looks good!\n');
  console.log('Next steps:');
  console.log('1. Start your server: npm start');
  console.log('2. Test verification with the cURL command above');
  console.log('3. Configure webhook in Meta Business Suite');
  console.log('4. Submit a test lead\n');
  console.log('📖 See META_WEBHOOK_QUICK_START.md for detailed steps\n');
  process.exit(0);
}
