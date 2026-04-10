# Load Testing

## Install k6

```bash
choco install k6
```

## Backend Tests

```bash
# Basic test
k6 run load-tests/backend-api.js

# With auth token
k6 run -e BASE_URL=http://localhost:3000 -e AUTH_TOKEN=your_token load-tests/backend-api.js

# Custom load
k6 run --vus 100 --duration 5m load-tests/backend-api.js
```

## Frontend Tests

```bash
# Browser test
k6 run load-tests/frontend-browser.js

# Custom URL
k6 run -e BASE_URL=http://localhost:5173 load-tests/frontend-browser.js
```

## Metrics

- `http_req_duration` - Request time
- `http_req_failed` - Failed requests
- `browser_web_vital_fcp` - First Contentful Paint
- `browser_web_vital_lcp` - Largest Contentful Paint
