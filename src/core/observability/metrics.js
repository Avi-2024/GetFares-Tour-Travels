function classifyStatus(statusCode) {
  if (statusCode >= 500) {
    return '5xx';
  }
  if (statusCode >= 400) {
    return '4xx';
  }
  if (statusCode >= 300) {
    return '3xx';
  }
  if (statusCode >= 200) {
    return '2xx';
  }
  return '1xx';
}

function sanitizeLabel(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function normalizeRoute(req) {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }

  if (req.path) {
    return req.path;
  }

  const originalUrl = req.originalUrl || '';
  const [path] = originalUrl.split('?');
  return path || 'unknown';
}

function createMetricsStore({ serviceName, serviceVersion }) {
  const startedAt = Date.now();
  const routeStats = new Map();
  const globalStatusCounters = {
    '1xx': 0,
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  };

  function getOrCreateRouteStat(method, route) {
    const key = `${method} ${route}`;
    if (!routeStats.has(key)) {
      routeStats.set(key, {
        method,
        route,
        requestCount: 0,
        durationMsSum: 0,
        statusClassCount: {
          '1xx': 0,
          '2xx': 0,
          '3xx': 0,
          '4xx': 0,
          '5xx': 0,
        },
      });
    }

    return routeStats.get(key);
  }

  function trackRequest({ method, route, statusCode, durationMs }) {
    const statusClass = classifyStatus(statusCode);
    const stat = getOrCreateRouteStat(method, route);

    stat.requestCount += 1;
    stat.durationMsSum += durationMs;
    stat.statusClassCount[statusClass] += 1;
    globalStatusCounters[statusClass] += 1;
  }

  function snapshot() {
    const routes = Array.from(routeStats.values()).map((item) => ({
      method: item.method,
      route: item.route,
      requestCount: item.requestCount,
      durationMsSum: Number(item.durationMsSum.toFixed(3)),
      durationMsAvg: item.requestCount > 0 ? Number((item.durationMsSum / item.requestCount).toFixed(3)) : 0,
      statusClassCount: { ...item.statusClassCount },
    }));

    const requestCount = routes.reduce((total, item) => total + item.requestCount, 0);
    const durationMsSum = routes.reduce((total, item) => total + item.durationMsSum, 0);

    return {
      service: serviceName,
      version: serviceVersion,
      startedAt: new Date(startedAt).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      totals: {
        requestCount,
        durationMsSum: Number(durationMsSum.toFixed(3)),
        durationMsAvg: requestCount > 0 ? Number((durationMsSum / requestCount).toFixed(3)) : 0,
        statusClassCount: { ...globalStatusCounters },
      },
      routes,
    };
  }

  function renderPrometheus() {
    const stats = snapshot();
    const lines = [];

    lines.push('# HELP process_uptime_seconds Process uptime in seconds.');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${stats.uptimeSeconds}`);

    lines.push('# HELP http_requests_total Total HTTP requests by method, route, and status class.');
    lines.push('# TYPE http_requests_total counter');

    lines.push('# HELP http_request_duration_ms_sum Sum of HTTP request duration in milliseconds.');
    lines.push('# TYPE http_request_duration_ms_sum counter');

    lines.push('# HELP http_request_duration_ms_count Count of HTTP requests used for duration average.');
    lines.push('# TYPE http_request_duration_ms_count counter');

    for (const routeStat of stats.routes) {
      const labels = `method="${sanitizeLabel(routeStat.method)}",route="${sanitizeLabel(routeStat.route)}"`;

      lines.push(`http_request_duration_ms_sum{${labels}} ${routeStat.durationMsSum}`);
      lines.push(`http_request_duration_ms_count{${labels}} ${routeStat.requestCount}`);

      for (const [statusClass, count] of Object.entries(routeStat.statusClassCount)) {
        if (count === 0) {
          continue;
        }
        lines.push(`http_requests_total{${labels},status_class="${statusClass}"} ${count}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  return {
    trackRequest,
    snapshot,
    renderPrometheus,
  };
}

function createRequestMetricsMiddleware({ metricsStore }) {
  return function requestMetrics(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      metricsStore.trackRequest({
        method: req.method,
        route: normalizeRoute(req),
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  };
}

module.exports = {
  createMetricsStore,
  createRequestMetricsMiddleware,
};
