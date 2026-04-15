/**
 * Registers a throwaway user, loads GET /api/quotations/:id.
 * Env: QUOTATION_ID, DATABASE_CLIENT (defaults to mysql)
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";

dotenv.config();
process.env.DATABASE_CLIENT = "mysql";

const { createApp } = await import("../src/app.js");

const DEFAULT_QUOTATION_ID = "a6a0866b-f8da-491d-95a7-71338aeed8db";

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const quotationId =
    String(process.env.QUOTATION_ID || "").trim() || DEFAULT_QUOTATION_ID;

  const { app } = createApp();
  const server = app.listen(0);

  const baseUrl = await new Promise((resolve, reject) => {
    server.once("listening", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
    server.once("error", reject);
  });

  async function request(path, { method = "GET", headers = {}, body } = {}) {
    const init = {
      method,
      headers: { ...headers },
    };
    if (body !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${path}`, init);
    const json = await parseJson(response);
    return { response, json };
  }

  const seed = randomUUID().slice(0, 8);
  const email = `qtest-${seed}@example.com`;
  const password = "StrongPass123";

  try {
    const register = await request("/api/auth/register", {
      method: "POST",
      body: {
        fullName: "Quotation Detail Tester",
        email,
        phone: "+919888888888",
        password,
        role: "sales_consultant",
      },
    });
    assert.equal(
      register.response.status,
      201,
      `register failed: ${JSON.stringify(register.json)}`,
    );
    const token = register.json?.data?.accessToken;
    assert.ok(token, "accessToken missing");

    const getQuote = await request(`/api/quotations/${quotationId}`, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(
      getQuote.response.status,
      200,
      `GET quotation failed: ${JSON.stringify(getQuote.json)}`,
    );
    assert.equal(getQuote.json?.data?.id, quotationId);

    console.log(
      JSON.stringify(
        {
          ok: true,
          quotationId,
          status: getQuote.json?.data?.status,
          quoteNumber: getQuote.json?.data?.quoteNumber,
          title: getQuote.json?.data?.quotationTitle,
        },
        null,
        2,
      ),
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
