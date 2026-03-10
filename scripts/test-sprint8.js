const assert = require('node:assert/strict');

const { createApp } = require('../src/app');

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

async function main() {
  const { app, runtime } = createApp();
  const server = app.listen(0);
  const results = [];

  function addResult(name, passed, details) {
    results.push({ name, passed, details });
  }

  const baseUrl = await new Promise((resolve, reject) => {
    server.once('listening', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
    server.once('error', reject);
  });

  async function request(path, { method = 'GET', headers = {}, body } = {}) {
    const init = {
      method,
      headers: { ...headers },
    };

    if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, init);
    const json = await parseJson(response);
    return { response, json };
  }

  try {
    const result = await request('/health');
    assert.equal(result.response.status, 200);
    assert.equal(result.json?.status, 'ok');
    assert.equal(typeof result.json?.version, 'string');
    addResult('Health endpoint', true, 'GET /health returned 200 and version');
  } catch (error) {
    addResult('Health endpoint', false, error.message);
  }

  try {
    const result = await request('/health/live');
    assert.equal(result.response.status, 200);
    assert.equal(result.json?.status, 'alive');
    addResult('Liveness endpoint', true, 'GET /health/live returned alive');
  } catch (error) {
    addResult('Liveness endpoint', false, error.message);
  }

  try {
    const result = await request('/health/ready');
    assert.equal(result.response.status, 200);
    assert.equal(result.json?.status, 'ready');
    assert.equal(result.json?.ready, true);
    assert.equal(result.json?.checks?.app?.ok, true);
    assert.equal(result.json?.checks?.db?.ok, true);
    addResult('Readiness endpoint', true, 'GET /health/ready returned ready=true');
  } catch (error) {
    addResult('Readiness endpoint', false, error.message);
  }

  try {
    const metrics = await request('/metrics');
    assert.equal(metrics.response.status, 200);
    const metricsText = metrics.json?.raw || '';
    assert.ok(metricsText.includes('process_uptime_seconds'));

    const metricsJson = await request('/metrics/json');
    assert.equal(metricsJson.response.status, 200);
    assert.equal(typeof metricsJson.json?.data?.totals?.requestCount, 'number');

    addResult('Metrics endpoints', true, '/metrics and /metrics/json returned expected payload');
  } catch (error) {
    addResult('Metrics endpoints', false, error.message);
  }

  try {
    runtime.isShuttingDown = true;

    const result = await request('/health/ready');
    assert.equal(result.response.status, 503);
    assert.equal(result.json?.status, 'shutting_down');
    assert.equal(result.json?.ready, false);

    addResult('Readiness during shutdown', true, 'GET /health/ready returned 503 while draining');
  } catch (error) {
    addResult('Readiness during shutdown', false, error.message);
  } finally {
    runtime.isShuttingDown = false;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  console.log('\nSprint 8 Smoke Test Results');
  console.log('---------------------------');
  for (const item of results) {
    const prefix = item.passed ? 'PASS' : 'FAIL';
    console.log(`${prefix} | ${item.name} | ${item.details}`);
  }
  const failed = results.filter((item) => !item.passed);
  console.log('---------------------------');
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Sprint 8 smoke test execution failed:', error.message);
  process.exitCode = 1;
});
