import {
  decryptSecret,
  encryptSecret,
  secretStatus,
} from "../../core/security/secretCrypto.js";

const SECRET_FIELDS = ["accessToken", "appSecret", "verifyToken"];

function getEncryptionKey(config) {
  const key =
    config?.meta?.secretsEncryptionKey ||
    config?.secretsEncryptionKey ||
    null;
  return key && String(key).length >= 32 ? String(key) : null;
}

function encryptField(value, encryptionKey) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  return encryptSecret(text, encryptionKey);
}

function decryptField(value, encryptionKey) {
  if (!value) {
    return null;
  }
  try {
    return decryptSecret(value, encryptionKey);
  } catch {
    return null;
  }
}

function encryptPageSecrets(payload = {}, encryptionKey) {
  const out = {};
  if (payload.accessToken !== undefined) {
    out.access_token = encryptField(payload.accessToken, encryptionKey);
  }
  if (payload.appSecret !== undefined) {
    out.app_secret = encryptField(payload.appSecret, encryptionKey);
  }
  if (payload.verifyToken !== undefined) {
    out.verify_token = encryptField(payload.verifyToken, encryptionKey);
  }
  return out;
}

function decryptPageRow(row, encryptionKey) {
  if (!row) {
    return null;
  }
  return {
    accessToken: decryptField(row.access_token ?? row.accessToken, encryptionKey),
    appSecret: decryptField(row.app_secret ?? row.appSecret, encryptionKey),
    verifyToken: decryptField(row.verify_token ?? row.verifyToken, encryptionKey),
  };
}

function buildPageSecretPublic(row) {
  const confirmedAt = row?.secrets_confirmed_at ?? row?.secretsConfirmedAt ?? null;
  return {
    accessToken: secretStatus(row?.access_token ?? row?.accessToken, {
      confirmedAt,
    }),
    appSecret: secretStatus(row?.app_secret ?? row?.appSecret, { confirmedAt }),
    verifyToken: secretStatus(row?.verify_token ?? row?.verifyToken, {
      confirmedAt,
    }),
  };
}

function buildIntegrationSecretPublic(row) {
  const confirmedAt = row?.secrets_confirmed_at ?? row?.secretsConfirmedAt ?? null;
  return {
    appSecret: secretStatus(row?.app_secret ?? row?.appSecret, { confirmedAt }),
    verifyToken: secretStatus(row?.verify_token ?? row?.verifyToken, {
      confirmedAt,
    }),
  };
}

function shouldUpdateSecret(incoming) {
  if (incoming === undefined) {
    return false;
  }
  const text = String(incoming ?? "").trim();
  return text.length > 0;
}

export {
  SECRET_FIELDS,
  getEncryptionKey,
  encryptField,
  decryptField,
  encryptPageSecrets,
  decryptPageRow,
  buildPageSecretPublic,
  buildIntegrationSecretPublic,
  shouldUpdateSecret,
};
