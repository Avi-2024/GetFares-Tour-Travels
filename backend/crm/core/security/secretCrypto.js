import crypto from "node:crypto";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(rawKey) {
  const normalized = String(rawKey || "").trim();
  if (!normalized || normalized.length < 32) {
    return null;
  }
  return crypto.createHash("sha256").update(normalized, "utf8").digest();
}

function isEncryptedValue(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encryptSecret(plaintext, encryptionKey) {
  const text = String(plaintext ?? "").trim();
  if (!text) {
    return null;
  }

  const key = deriveKey(encryptionKey);
  if (!key) {
    throw new Error("META_SECRETS_ENCRYPTION_KEY must be at least 32 characters");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptSecret(ciphertext, encryptionKey) {
  if (!ciphertext) {
    return null;
  }

  const raw = String(ciphertext);
  if (!isEncryptedValue(raw)) {
    return raw.trim() || null;
  }

  const key = deriveKey(encryptionKey);
  if (!key) {
    throw new Error("META_SECRETS_ENCRYPTION_KEY must be at least 32 characters");
  }

  const parts = raw.slice(PREFIX.length).split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const encrypted = Buffer.from(dataB64, "base64url");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function secretStatus(value, { confirmedAt = null } = {}) {
  const configured = Boolean(String(value || "").trim());
  return {
    configured,
    confirmed: configured && Boolean(confirmedAt),
  };
}

function toPublicSecretField(status) {
  return status;
}

export {
  encryptSecret,
  decryptSecret,
  isEncryptedValue,
  secretStatus,
  toPublicSecretField,
  deriveKey,
};
