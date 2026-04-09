const AUTOMATION_RUNS_TABLE = "automation_job_runs";

function normalizeIntervalMs(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function lockKeyFromString(input) {
  const value = String(input || "automation");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash || 1);
}

function coerceProcessedCount(result) {
  if (result === null || result === undefined) {
    return 0;
  }
  if (typeof result === "number" && Number.isFinite(result)) {
    return Math.max(0, Math.floor(result));
  }
  if (typeof result !== "object") {
    return 0;
  }

  const candidates = [
    result.processed,
    result.triggered,
    result.count,
    result.scheduled,
    result.marked,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return 0;
}

function toJsonDetails(value) {
  if (value === undefined) {
    return {};
  }
  if (value === null) {
    return { value: null };
  }
  if (typeof value === "object") {
    return value;
  }
  return { value };
}

function createAutomationScheduler({
  logger,
  db,
  metricsStore,
  jobs = [],
  config = {},
}) {
  const state = {
    startedAt: null,
    isRunning: false,
    jobs: new Map(),
  };

  const timers = new Map();
  const localLocks = new Set();
  const tableCache = new Map();

  function canUseDbLock() {
    return typeof db?.query === "function" && Boolean(db?.pool);
  }

  async function hasTable(tableName) {
    if (!canUseDbLock()) {
      return false;
    }

    if (tableCache.has(tableName)) {
      return tableCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableCache.set(tableName, false);
      return false;
    }
  }

  async function acquireLock(jobName) {
    const lockName = `automation:${jobName}`;
    const lockKey = lockKeyFromString(lockName);

    if (canUseDbLock() && String(db?.adapter || "").toLowerCase() === "postgres") {
      try {
        const result = await db.query(
          "SELECT pg_try_advisory_lock(?) AS locked",
          [lockKey],
        );
        const locked = Boolean(result.rows?.[0]?.locked);
        if (!locked) {
          return {
            acquired: false,
            release: async () => undefined,
          };
        }

        return {
          acquired: true,
          release: async () => {
            try {
              await db.query("SELECT pg_advisory_unlock(?)", [lockKey]);
            } catch (error) {
              logger?.warn?.(
                { err: error, module: "automation", jobName, lockKey },
                "Failed to release advisory lock",
              );
            }
          },
        };
      } catch (error) {
        logger?.warn?.(
          { err: error, module: "automation", jobName },
          "Falling back to local lock due advisory lock failure",
        );
      }
    }

    if (canUseDbLock() && String(db?.adapter || "").toLowerCase() === "mysql") {
      try {
        const result = await db.query(
          "SELECT GET_LOCK(?, 0) AS locked",
          [lockName],
        );
        const locked = Number(result.rows?.[0]?.locked || 0) === 1;
        if (!locked) {
          return {
            acquired: false,
            release: async () => undefined,
          };
        }

        return {
          acquired: true,
          release: async () => {
            try {
              await db.query("SELECT RELEASE_LOCK(?)", [lockName]);
            } catch (error) {
              logger?.warn?.(
                { err: error, module: "automation", jobName, lockName },
                "Failed to release mysql lock",
              );
            }
          },
        };
      } catch (error) {
        logger?.warn?.(
          { err: error, module: "automation", jobName },
          "Falling back to local lock due mysql lock failure",
        );
      }
    }

    if (localLocks.has(lockName)) {
      return {
        acquired: false,
        release: async () => undefined,
      };
    }
    localLocks.add(lockName);
    return {
      acquired: true,
      release: async () => {
        localLocks.delete(lockName);
      },
    };
  }

  async function createRunRecord(jobName) {
    const tableExists = await hasTable(AUTOMATION_RUNS_TABLE);
    if (!tableExists || typeof db?.insert !== "function") {
      return null;
    }

    try {
      return db.insert(AUTOMATION_RUNS_TABLE, {
        job_name: jobName,
        status: "RUNNING",
        started_at: new Date().toISOString(),
        lock_owner: `pid:${process.pid}`,
      });
    } catch (error) {
      logger?.warn?.(
        { err: error, module: "automation", jobName },
        "Unable to create automation run record",
      );
      return null;
    }
  }

  async function completeRunRecord(runRecord, payload) {
    if (!runRecord?.id || typeof db?.update !== "function") {
      return;
    }

    try {
      await db.update(AUTOMATION_RUNS_TABLE, runRecord.id, {
        status: payload.status,
        finished_at: new Date().toISOString(),
        records_processed: payload.recordsProcessed,
        details: payload.details,
        error_message: payload.errorMessage || null,
      });
    } catch (error) {
      logger?.warn?.(
        { err: error, module: "automation", jobName: runRecord.job_name },
        "Unable to update automation run record",
      );
    }
  }

  async function runJob(job) {
    const startedAt = Date.now();
    const runRecord = await createRunRecord(job.name);
    const lock = await acquireLock(job.name);

    const current = state.jobs.get(job.name) || {};
    const next = {
      ...current,
      lastStartedAt: new Date(startedAt).toISOString(),
      runCount: Number(current.runCount || 0) + 1,
    };
    state.jobs.set(job.name, next);

    if (!lock.acquired) {
      const durationMs = Date.now() - startedAt;
      const skippedPayload = {
        status: "SKIPPED",
        recordsProcessed: 0,
        details: { reason: "LOCK_NOT_ACQUIRED" },
        errorMessage: null,
      };
      await completeRunRecord(runRecord, skippedPayload);
      metricsStore?.trackAutomationJob?.({
        jobName: job.name,
        status: "SKIPPED",
        durationMs,
        recordsProcessed: 0,
      });
      state.jobs.set(job.name, {
        ...next,
        lastFinishedAt: new Date().toISOString(),
        lastDurationMs: durationMs,
        lastStatus: "SKIPPED",
      });
      return;
    }

    let status = "SUCCESS";
    let result = {};
    let errorMessage = null;

    try {
      result = (await job.run()) || {};
    } catch (error) {
      status = "FAILED";
      result = {
        message: error?.message || "Unknown automation error",
      };
      errorMessage = error?.message || "Unknown automation error";
      logger?.error?.(
        { err: error, module: "automation", jobName: job.name },
        "Automation job failed",
      );
    } finally {
      await lock.release();
    }

    const durationMs = Date.now() - startedAt;
    const recordsProcessed = coerceProcessedCount(result);
    await completeRunRecord(runRecord, {
      status,
      recordsProcessed,
      details: toJsonDetails(result),
      errorMessage,
    });

    metricsStore?.trackAutomationJob?.({
      jobName: job.name,
      status,
      durationMs,
      recordsProcessed,
    });

    state.jobs.set(job.name, {
      ...next,
      lastFinishedAt: new Date().toISOString(),
      lastDurationMs: durationMs,
      lastStatus: status,
      lastProcessed: recordsProcessed,
    });
  }

  function scheduleJob(job, position) {
    const startupDelayMs = normalizeIntervalMs(
      job.startupDelayMs,
      normalizeIntervalMs(config.startupDelayMs, 10000) + position * 1500,
    );
    const intervalMs = normalizeIntervalMs(job.intervalMs, 60000);

    const timeout = setTimeout(() => {
      void runJob(job);
      const interval = setInterval(() => {
        void runJob(job);
      }, intervalMs);
      timers.set(`${job.name}:interval`, interval);
    }, startupDelayMs);

    timers.set(`${job.name}:timeout`, timeout);
  }

  function start() {
    if (state.isRunning) {
      return;
    }
    if (config.enabled === false) {
      logger?.info?.(
        { module: "automation" },
        "Automation scheduler disabled by configuration",
      );
      return;
    }

    state.startedAt = new Date().toISOString();
    state.isRunning = true;

    jobs.forEach((job, index) => {
      if (!job?.name || typeof job?.run !== "function") {
        return;
      }
      state.jobs.set(job.name, {
        runCount: 0,
        intervalMs: normalizeIntervalMs(job.intervalMs, 60000),
        lastStatus: null,
        lastDurationMs: null,
        lastProcessed: 0,
      });
      scheduleJob(job, index);
    });

    logger?.info?.(
      { module: "automation", jobs: Array.from(state.jobs.keys()) },
      "Automation scheduler started",
    );
  }

  function stop() {
    if (!state.isRunning) {
      return;
    }

    Array.from(timers.values()).forEach((handle) => {
      clearTimeout(handle);
      clearInterval(handle);
    });
    timers.clear();
    localLocks.clear();
    state.isRunning = false;

    logger?.info?.({ module: "automation" }, "Automation scheduler stopped");
  }

  function snapshot() {
    return {
      isRunning: state.isRunning,
      startedAt: state.startedAt,
      jobs: Array.from(state.jobs.entries()).map(([name, details]) => ({
        name,
        ...details,
      })),
    };
  }

  return Object.freeze({
    start,
    stop,
    snapshot,
    runJob,
  });
}

export { createAutomationScheduler };
