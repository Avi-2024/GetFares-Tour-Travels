function classifyStatus(statusCode) {
  if (statusCode >= 500) {
    return "5xx";
  }
  if (statusCode >= 400) {
    return "4xx";
  }
  if (statusCode >= 300) {
    return "3xx";
  }
  if (statusCode >= 200) {
    return "2xx";
  }
  return "1xx";
}

function normalizeAutomationStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "FAILED") {
    return "FAILED";
  }
  if (normalized === "SKIPPED") {
    return "SKIPPED";
  }
  return "SUCCESS";
}

function sanitizeLabel(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function normalizeRoute(req) {
  if (req.route?.path) {
    return `${req.baseUrl || ""}${req.route.path}`;
  }

  if (req.path) {
    return req.path;
  }

  const originalUrl = req.originalUrl || "";
  const [path] = originalUrl.split("?");
  return path || "unknown";
}

function createMetricsStore({ serviceName, serviceVersion }) {
  const startedAt = Date.now();
  const routeStats = new Map();
  const globalStatusCounters = {
    "1xx": 0,
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  };
  const automationJobs = new Map();
  const automationStatusCounters = {
    SUCCESS: 0,
    FAILED: 0,
    SKIPPED: 0,
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
          "1xx": 0,
          "2xx": 0,
          "3xx": 0,
          "4xx": 0,
          "5xx": 0,
        },
      });
    }

    return routeStats.get(key);
  }

  function getOrCreateAutomationStat(jobName) {
    if (!automationJobs.has(jobName)) {
      automationJobs.set(jobName, {
        jobName,
        runCount: 0,
        durationMsSum: 0,
        processedSum: 0,
        lastStatus: null,
        statusCount: {
          SUCCESS: 0,
          FAILED: 0,
          SKIPPED: 0,
        },
      });
    }

    return automationJobs.get(jobName);
  }

  function trackRequest({ method, route, statusCode, durationMs }) {
    const statusClass = classifyStatus(statusCode);
    const stat = getOrCreateRouteStat(method, route);

    stat.requestCount += 1;
    stat.durationMsSum += durationMs;
    stat.statusClassCount[statusClass] += 1;
    globalStatusCounters[statusClass] += 1;
  }

  function trackAutomationJob({
    jobName,
    status,
    durationMs,
    recordsProcessed,
  }) {
    if (!jobName) {
      return;
    }

    const normalizedStatus = normalizeAutomationStatus(status);
    const stat = getOrCreateAutomationStat(jobName);
    const parsedDuration = Number(durationMs);
    const parsedRecords = Number(recordsProcessed);

    stat.runCount += 1;
    stat.durationMsSum += Number.isFinite(parsedDuration) ? parsedDuration : 0;
    stat.processedSum += Number.isFinite(parsedRecords) ? parsedRecords : 0;
    stat.lastStatus = normalizedStatus;
    stat.statusCount[normalizedStatus] += 1;
    automationStatusCounters[normalizedStatus] += 1;
  }

  function snapshot() {
    const routes = Array.from(routeStats.values()).map((item) => ({
      method: item.method,
      route: item.route,
      requestCount: item.requestCount,
      durationMsSum: Number(item.durationMsSum.toFixed(3)),
      durationMsAvg:
        item.requestCount > 0
          ? Number((item.durationMsSum / item.requestCount).toFixed(3))
          : 0,
      statusClassCount: { ...item.statusClassCount },
    }));

    const requestCount = routes.reduce(
      (total, item) => total + item.requestCount,
      0,
    );
    const durationMsSum = routes.reduce(
      (total, item) => total + item.durationMsSum,
      0,
    );
    const automation = Array.from(automationJobs.values()).map((item) => ({
      jobName: item.jobName,
      runCount: item.runCount,
      durationMsSum: Number(item.durationMsSum.toFixed(3)),
      durationMsAvg:
        item.runCount > 0
          ? Number((item.durationMsSum / item.runCount).toFixed(3))
          : 0,
      processedSum: item.processedSum,
      processedAvg:
        item.runCount > 0
          ? Number((item.processedSum / item.runCount).toFixed(3))
          : 0,
      lastStatus: item.lastStatus,
      statusCount: { ...item.statusCount },
    }));
    const automationRunCount = automation.reduce(
      (total, item) => total + item.runCount,
      0,
    );
    const automationDurationMsSum = automation.reduce(
      (total, item) => total + item.durationMsSum,
      0,
    );
    const automationProcessedSum = automation.reduce(
      (total, item) => total + item.processedSum,
      0,
    );

    return {
      service: serviceName,
      version: serviceVersion,
      startedAt: new Date(startedAt).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      totals: {
        requestCount,
        durationMsSum: Number(durationMsSum.toFixed(3)),
        durationMsAvg:
          requestCount > 0
            ? Number((durationMsSum / requestCount).toFixed(3))
            : 0,
        statusClassCount: { ...globalStatusCounters },
      },
      automation: {
        runCount: automationRunCount,
        durationMsSum: Number(automationDurationMsSum.toFixed(3)),
        durationMsAvg:
          automationRunCount > 0
            ? Number((automationDurationMsSum / automationRunCount).toFixed(3))
            : 0,
        processedSum: automationProcessedSum,
        statusCount: { ...automationStatusCounters },
        jobs: automation,
      },
      routes,
    };
  }

  function renderPrometheus() {
    const stats = snapshot();
    const lines = [];

    lines.push("# HELP process_uptime_seconds Process uptime in seconds.");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(`process_uptime_seconds ${stats.uptimeSeconds}`);

    lines.push(
      "# HELP http_requests_total Total HTTP requests by method, route, and status class.",
    );
    lines.push("# TYPE http_requests_total counter");

    lines.push(
      "# HELP http_request_duration_ms_sum Sum of HTTP request duration in milliseconds.",
    );
    lines.push("# TYPE http_request_duration_ms_sum counter");

    lines.push(
      "# HELP http_request_duration_ms_count Count of HTTP requests used for duration average.",
    );
    lines.push("# TYPE http_request_duration_ms_count counter");
    lines.push(
      "# HELP automation_job_runs_total Total automation job runs by status.",
    );
    lines.push("# TYPE automation_job_runs_total counter");
    lines.push(
      "# HELP automation_job_duration_ms_sum Sum of automation job duration in milliseconds.",
    );
    lines.push("# TYPE automation_job_duration_ms_sum counter");
    lines.push(
      "# HELP automation_job_duration_ms_count Count of automation job runs used for duration average.",
    );
    lines.push("# TYPE automation_job_duration_ms_count counter");
    lines.push(
      "# HELP automation_job_records_processed_total Total records processed by automation jobs.",
    );
    lines.push("# TYPE automation_job_records_processed_total counter");

    for (const routeStat of stats.routes) {
      const labels = `method="${sanitizeLabel(routeStat.method)}",route="${sanitizeLabel(routeStat.route)}"`;

      lines.push(
        `http_request_duration_ms_sum{${labels}} ${routeStat.durationMsSum}`,
      );
      lines.push(
        `http_request_duration_ms_count{${labels}} ${routeStat.requestCount}`,
      );

      for (const [statusClass, count] of Object.entries(
        routeStat.statusClassCount,
      )) {
        if (count === 0) {
          continue;
        }
        lines.push(
          `http_requests_total{${labels},status_class="${statusClass}"} ${count}`,
        );
      }
    }

    for (const job of stats.automation.jobs || []) {
      const labels = `job_name="${sanitizeLabel(job.jobName)}"`;
      lines.push(
        `automation_job_duration_ms_sum{${labels}} ${job.durationMsSum}`,
      );
      lines.push(`automation_job_duration_ms_count{${labels}} ${job.runCount}`);
      lines.push(
        `automation_job_records_processed_total{${labels}} ${job.processedSum}`,
      );

      for (const [status, count] of Object.entries(job.statusCount || {})) {
        if (count === 0) {
          continue;
        }
        lines.push(
          `automation_job_runs_total{${labels},status="${status}"} ${count}`,
        );
      }
    }

    return `${lines.join("\n")}\n`;
  }

  return {
    trackRequest,
    trackAutomationJob,
    snapshot,
    renderPrometheus,
  };
}

function createRequestMetricsMiddleware({ metricsStore }) {
  return function requestMetrics(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
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

export {
  createMetricsStore,
  createRequestMetricsMiddleware,
};
