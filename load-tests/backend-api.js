import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` }),
  };

  // Health check
  let res = http.get(`${BASE_URL}/api/health`, { headers });
  check(res, { 'health 200': (r) => r.status === 200 }) || errorRate.add(1);

  // Leads list
  res = http.get(`${BASE_URL}/api/leads`, { headers });
  check(res, { 'leads 200': (r) => r.status === 200 }) || errorRate.add(1);

  // Quotations list
  res = http.get(`${BASE_URL}/api/quotations`, { headers });
  check(res, { 'quotations 200': (r) => r.status === 200 }) || errorRate.add(1);

  // Bookings list
  res = http.get(`${BASE_URL}/api/bookings`, { headers });
  check(res, { 'bookings 200': (r) => r.status === 200 }) || errorRate.add(1);

  sleep(1);
}
