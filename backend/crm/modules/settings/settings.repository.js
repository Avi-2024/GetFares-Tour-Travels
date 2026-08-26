import { randomUUID } from "node:crypto";

import {
  defaultLeadStatusWorkflow,
  normalizeStatusCode,
  toApiMainStatus,
  toApiSubStatus,
} from "../leads/leadStatusWorkflow.config.js";

function createSettingsRepository({ db, logger, schema }) {
  async function listAll() {
    return db.findMany(schema.tableName, {});
  }

  async function findByKey(key) {
    return db.findOne(schema.tableName, { key });
  }

  async function upsert(key, value, updatedBy = null) {
    const now = new Date().toISOString();
    const existing = await findByKey(key);

    if (existing) {
      logger.debug(
        { module: "settings", section: key },
        "Updating settings section",
      );
      const next = await db.update(schema.tableName, existing.id, {
        key,
        value,
        updated_by: updatedBy || existing.updated_by || null,
        updated_at: now,
      });
      return next || existing;
    }

    logger.debug(
      { module: "settings", section: key },
      "Creating settings section",
    );
    return db.insert(schema.tableName, {
      key,
      value,
      updated_by: updatedBy,
      created_at: now,
      updated_at: now,
    });
  }

  function isMissingWorkflowTableError(error) {
    return /doesn't exist|Unknown table|Invalid object name/i.test(
      String(error?.message || ""),
    );
  }

  async function listLeadStatusWorkflow({ activeOnly = false } = {}) {
    if (typeof db.query !== "function" || !["mysql", "mssql"].includes(db.adapter)) {
      return defaultLeadStatusWorkflow();
    }

    try {
      const activeMainWhere = activeOnly ? "WHERE is_active = 1" : "";
      const activeSubWhere = activeOnly ? "WHERE s.is_active = 1 AND m.is_active = 1" : "";
      const mainResult = await db.query(
        `
          SELECT id, code, label, canonical_status, sort_order, color,
                 is_active, is_system, is_terminal, requires_sub_status,
                 requires_quotation, creates_booking, is_booking_controlled
          FROM \`${schema.leadStatusMainTable}\`
          ${activeMainWhere}
          ORDER BY sort_order ASC, label ASC
        `,
      );
      const subResult = await db.query(
        `
          SELECT s.id, s.main_status_id, m.code AS main_status_code, s.code,
                 s.label, s.sort_order, s.is_active, s.is_system, s.is_terminal
          FROM \`${schema.leadStatusSubTable}\` s
          JOIN \`${schema.leadStatusMainTable}\` m ON m.id = s.main_status_id
          ${activeSubWhere}
          ORDER BY m.sort_order ASC, s.sort_order ASC, s.label ASC
        `,
      );
      return {
        mainStatuses: (mainResult.rows || []).map(toApiMainStatus),
        subStatuses: (subResult.rows || []).map(toApiSubStatus),
      };
    } catch (error) {
      if (isMissingWorkflowTableError(error)) {
        logger?.warn?.(
          { err: error },
          "lead status workflow tables missing; returning default workflow",
        );
        return defaultLeadStatusWorkflow();
      }
      throw error;
    }
  }

  async function createLeadStatusMain(payload = {}, updatedBy = null) {
    const id = randomUUID();
    const code = normalizeStatusCode(payload.code || payload.label);
    await db.query(
      `
        INSERT INTO \`${schema.leadStatusMainTable}\`
          (id, code, label, canonical_status, sort_order, color, is_active,
           is_system, is_terminal, requires_sub_status, requires_quotation,
           creates_booking, is_booking_controlled, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        code,
        payload.label,
        payload.canonicalStatus,
        payload.sortOrder ?? 0,
        payload.color || "#2563eb",
        payload.isActive === false ? 0 : 1,
        payload.isTerminal ? 1 : 0,
        payload.requiresSubStatus ? 1 : 0,
        payload.requiresQuotation ? 1 : 0,
        payload.createsBooking ? 1 : 0,
        payload.isBookingControlled ? 1 : 0,
        updatedBy,
        updatedBy,
      ],
    );
    return listLeadStatusWorkflow();
  }

  async function updateLeadStatusMain(id, payload = {}, updatedBy = null) {
    const fields = [];
    const params = [];
    const push = (column, value) => {
      fields.push(`\`${column}\` = ?`);
      params.push(value);
    };

    if (payload.label !== undefined) push("label", payload.label);
    if (payload.sortOrder !== undefined) push("sort_order", payload.sortOrder);
    if (payload.color !== undefined) push("color", payload.color || "#2563eb");
    if (payload.isActive !== undefined) push("is_active", payload.isActive ? 1 : 0);
    if (payload.isTerminal !== undefined) push("is_terminal", payload.isTerminal ? 1 : 0);
    if (payload.requiresSubStatus !== undefined) push("requires_sub_status", payload.requiresSubStatus ? 1 : 0);
    if (payload.requiresQuotation !== undefined) push("requires_quotation", payload.requiresQuotation ? 1 : 0);
    if (payload.createsBooking !== undefined) push("creates_booking", payload.createsBooking ? 1 : 0);
    if (payload.isBookingControlled !== undefined) push("is_booking_controlled", payload.isBookingControlled ? 1 : 0);
    if (payload.canonicalStatus !== undefined) {
      const used = await db.query(
        `SELECT COUNT(*) AS total FROM \`leads\` WHERE main_status = (SELECT code FROM \`${schema.leadStatusMainTable}\` WHERE id = ? LIMIT 1)`,
        [id],
      );
      if (Number(used.rows?.[0]?.total || 0) === 0) {
        push("canonical_status", payload.canonicalStatus);
      }
    }

    if (!fields.length) return listLeadStatusWorkflow();
    fields.push("updated_by = ?");
    params.push(updatedBy);
    params.push(id);
    await db.query(
      `UPDATE \`${schema.leadStatusMainTable}\` SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );
    return listLeadStatusWorkflow();
  }

  async function createLeadStatusSub(payload = {}, updatedBy = null) {
    const id = randomUUID();
    const code = normalizeStatusCode(payload.code || payload.label);
    await db.query(
      `
        INSERT INTO \`${schema.leadStatusSubTable}\`
          (id, main_status_id, code, label, sort_order, is_active, is_system,
           is_terminal, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `,
      [
        id,
        payload.mainStatusId,
        code,
        payload.label,
        payload.sortOrder ?? 0,
        payload.isActive === false ? 0 : 1,
        payload.isTerminal ? 1 : 0,
        updatedBy,
        updatedBy,
      ],
    );
    return listLeadStatusWorkflow();
  }

  async function updateLeadStatusSub(id, payload = {}, updatedBy = null) {
    const fields = [];
    const params = [];
    const push = (column, value) => {
      fields.push(`\`${column}\` = ?`);
      params.push(value);
    };
    if (payload.label !== undefined) push("label", payload.label);
    if (payload.mainStatusId !== undefined) push("main_status_id", payload.mainStatusId);
    if (payload.sortOrder !== undefined) push("sort_order", payload.sortOrder);
    if (payload.isActive !== undefined) push("is_active", payload.isActive ? 1 : 0);
    if (payload.isTerminal !== undefined) push("is_terminal", payload.isTerminal ? 1 : 0);
    if (!fields.length) return listLeadStatusWorkflow();
    fields.push("updated_by = ?");
    params.push(updatedBy);
    params.push(id);
    await db.query(
      `UPDATE \`${schema.leadStatusSubTable}\` SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );
    return listLeadStatusWorkflow();
  }

  async function reorderLeadStatusWorkflow(payload = {}, updatedBy = null) {
    const main = Array.isArray(payload.mainStatuses) ? payload.mainStatuses : [];
    const sub = Array.isArray(payload.subStatuses) ? payload.subStatuses : [];
    for (const item of main) {
      if (item?.id && Number.isFinite(Number(item.sortOrder))) {
        await updateLeadStatusMain(item.id, { sortOrder: Number(item.sortOrder) }, updatedBy);
      }
    }
    for (const item of sub) {
      if (item?.id && Number.isFinite(Number(item.sortOrder))) {
        await updateLeadStatusSub(item.id, { sortOrder: Number(item.sortOrder) }, updatedBy);
      }
    }
    return listLeadStatusWorkflow();
  }

  return Object.freeze({
    listAll,
    findByKey,
    upsert,
    listLeadStatusWorkflow,
    createLeadStatusMain,
    updateLeadStatusMain,
    createLeadStatusSub,
    updateLeadStatusSub,
    reorderLeadStatusWorkflow,
  });
}

export { createSettingsRepository };
