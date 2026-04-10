import { MongoClient } from "mongodb";

const DEFAULT_COLLECTION = "application_logs";
const DEFAULT_DATABASE = "getfares_logs";

function resolveDatabaseName(connectionUrl) {
  try {
    const parsed = new URL(connectionUrl);
    const name = parsed.pathname?.replace(/^\//, "").trim();
    return name || DEFAULT_DATABASE;
  } catch {
    return DEFAULT_DATABASE;
  }
}

class MongoLogStore {
  constructor({
    connectionUrl,
    directConnectionUrl,
    collectionName,
    fallbackLogger,
  }) {
    this.connectionUrl = String(connectionUrl || "").trim();
    this.directConnectionUrl = String(directConnectionUrl || "").trim();
    this.collectionName = collectionName || DEFAULT_COLLECTION;
    this.fallbackLogger = fallbackLogger;
    this.client = null;
    this.collection = null;
    this.connectPromise = null;
    this.indexPromise = null;
    this.lastFailureAt = 0;
    this.retryDelayMs = 30_000;
    this.useDirectConnection = false;
  }

  isEnabled() {
    return Boolean(this.connectionUrl || this.directConnectionUrl);
  }

  resolveConnectionUrl() {
    if (this.useDirectConnection && this.directConnectionUrl) {
      return this.directConnectionUrl;
    }
    return this.connectionUrl || this.directConnectionUrl;
  }

  async ensureConnected() {
    if (!this.isEnabled()) {
      return null;
    }

    if (
      this.lastFailureAt &&
      Date.now() - this.lastFailureAt < this.retryDelayMs
    ) {
      return null;
    }

    if (this.collection) {
      return this.collection;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      const activeConnectionUrl = this.resolveConnectionUrl();
      const isSrvConnection = /^mongodb\+srv:\/\//i.test(activeConnectionUrl);
      const client = new MongoClient(activeConnectionUrl, {
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        ...(isSrvConnection
          ? {
              tls: true,
              tlsAllowInvalidCertificates: false,
            }
          : {}),
      });
      await client.connect();

      const databaseName = resolveDatabaseName(activeConnectionUrl);
      const db = client.db(databaseName);
      this.client = client;
      this.collection = db.collection(this.collectionName);
      this.lastFailureAt = 0;
      await this.ensureIndexes();
      return this.collection;
    })().catch((error) => {
      const canRetryDirect =
        !this.useDirectConnection &&
        Boolean(this.directConnectionUrl) &&
        this.directConnectionUrl !== this.connectionUrl;
      const isSrvDnsFailure = String(error?.message || "").includes(
        "querySrv ECONNREFUSED",
      );

      if (canRetryDirect && isSrvDnsFailure) {
        this.connectPromise = null;
        this.useDirectConnection = true;
        return this.ensureConnected();
      }

      this.connectPromise = null;
      this.collection = null;
      this.client = null;
      this.lastFailureAt = Date.now();
      const message = isSrvDnsFailure ?
          "Mongo log store unavailable. DNS SRV blocked."
        : "Mongo log store unavailable";
      this.fallbackLogger?.warn(
        { err: error, module: "logger", fileName: "mongo-log.store.js" },
        message,
      );
      return null;
    });

    return this.connectPromise;
  }

  async ensureIndexes() {
    if (!this.collection || this.indexPromise) {
      return this.indexPromise;
    }

    this.indexPromise = Promise.all([
      this.collection.createIndex({ createdAt: -1 }),
      this.collection.createIndex({ level: 1, createdAt: -1 }),
      this.collection.createIndex({ module: 1, createdAt: -1 }),
      this.collection.createIndex({ requestId: 1, createdAt: -1 }),
      this.collection.createIndex({ userId: 1, createdAt: -1 }),
      this.collection.createIndex({ statusCode: 1, createdAt: -1 }),
    ]).catch((error) => {
      this.fallbackLogger?.warn(
        { err: error, module: "logger", fileName: "mongo-log.store.js" },
        "Failed to create Mongo log indexes",
      );
    });

    return this.indexPromise;
  }

  async write(document) {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const collection = await this.ensureConnected();
      if (!collection) {
        return;
      }
      await collection.insertOne(document);
    } catch (error) {
      this.fallbackLogger?.warn(
        { err: error, module: "logger", fileName: "mongo-log.store.js" },
        "Failed to persist log document",
      );
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error) {
      this.fallbackLogger?.warn(
        { err: error, module: "logger", fileName: "mongo-log.store.js" },
        "Failed to close Mongo log client",
      );
    } finally {
      this.client = null;
      this.collection = null;
      this.connectPromise = null;
      this.indexPromise = null;
      this.lastFailureAt = 0;
      this.useDirectConnection = false;
    }
  }
}

export { MongoLogStore };
