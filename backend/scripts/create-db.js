#!/usr/bin/env node
import fs from "node:fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

function parseMySqlUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    database: decodeURIComponent((parsed.pathname || "").replace(/^\//, "")),
  };
}

function buildSslConfig() {
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return { rejectUnauthorized: false };
  }

  if (process.env.DATABASE_SSL_CA) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
    };
  }

  if (
    process.env.DATABASE_SSL_CA_PATH &&
    fs.existsSync(process.env.DATABASE_SSL_CA_PATH)
  ) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(process.env.DATABASE_SSL_CA_PATH, "utf8"),
    };
  }

  return undefined;
}

function resolveConnectionConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (
    databaseUrl.toLowerCase().startsWith("mysql://") ||
    databaseUrl.toLowerCase().startsWith("mysql2://")
  ) {
    return {
      ...parseMySqlUrl(databaseUrl),
      ssl: buildSslConfig(),
    };
  }

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "Provide DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  return {
    host,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user,
    password: process.env.MYSQL_PASSWORD || "",
    database,
    ssl: buildSslConfig(),
  };
}

const config = resolveConnectionConfig();
const targetDatabase = config.database;

const adminConnection = await mysql.createConnection({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  ssl: config.ssl,
});

try {
  await adminConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${targetDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(`Database ready: ${targetDatabase}`);
} finally {
  await adminConnection.end();
}
