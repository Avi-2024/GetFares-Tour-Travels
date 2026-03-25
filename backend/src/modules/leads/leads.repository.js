function createLeadsRepository({ db, logger, schema }) {
  const ASSIGNABLE_ROLES = new Set(["sales_consultant", "agent"]);
  const FOLLOWUP_TYPE_TO_DB = Object.freeze({
    CALL: 1,
    WHATSAPP: 2,
    EMAIL: 3,
    FINAL_REMINDER: 4,
    TASK: 4,
  });
  const FOLLOWUP_TYPE_FROM_DB = Object.freeze({
    1: "CALL",
    2: "WHATSAPP",
    3: "EMAIL",
    4: "FINAL_REMINDER",
  });
  const tableColumnsCache = new Map();
  const tableExistsCache = new Map();

  function canIntrospect() {
    return typeof db.query === "function" && Boolean(db.pool);
  }

  function toPositiveInt(value, fallback, max = 500) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(parsed, max);
  }

  function normalizeEmail(email) {
    if (!email) {
      return null;
    }
    return String(email).trim().toLowerCase();
  }

  function normalizePhone(phone) {
    if (!phone) {
      return null;
    }
    const normalized = String(phone).replace(/\D/g, "");
    return normalized || null;
  }

  function normalizeTextArray(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/^"|"$/g, ""))
          .filter(Boolean);
      }

      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function toDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  function deriveSlaBreached(row) {
    const storedValue = row.sla_breached ?? row.slaBreached ?? false;
    const responseAt = toDate(row.response_at ?? row.responseAt ?? null);
    const responseDeadline = toDate(
      row.response_deadline ?? row.responseDeadline ?? null,
    );

    if (responseAt && responseDeadline) {
      return responseAt.getTime() > responseDeadline.getTime();
    }

    return Boolean(storedValue);
  }

  function normalizeFollowupType(value) {
    if (value === undefined || value === null) {
      return 1;
    }

    if (Number.isInteger(value) && value >= 1 && value <= 4) {
      return value;
    }

    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 4) {
      return numeric;
    }

    const mapped = FOLLOWUP_TYPE_TO_DB[String(value).trim().toUpperCase()];
    return mapped || 1;
  }

  async function getTableColumns(tableName) {
    if (tableColumnsCache.has(tableName)) {
      return tableColumnsCache.get(tableName);
    }

    if (typeof db.query !== "function") {
      tableColumnsCache.set(tableName, null);
      return null;
    }

    try {
      const result = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
        [tableName],
      );

      const columnSet = new Set(result.rows.map((row) => row.column_name));
      tableColumnsCache.set(tableName, columnSet);
      return columnSet;
    } catch (_error) {
      tableColumnsCache.set(tableName, null);
      return null;
    }
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (!columns) {
      return true;
    }
    return columns.has(columnName);
  }

  function toCustomerDomain(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      panNumber: row.pan_number ?? row.panNumber ?? null,
      addressLine: row.address_line ?? row.addressLine ?? null,
      clientCurrency: row.client_currency ?? row.clientCurrency ?? null,
      preferences: row.preferences ?? null,
      lifetimeValue: row.lifetime_value ?? row.lifetimeValue ?? 0,
      segment: row.segment ?? "NEW",
      isDeleted: row.is_deleted ?? row.isDeleted ?? false,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  function toDestinationDomain(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name ?? null,
      country: row.country ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  function toDomain(
    row,
    customerMap = new Map(),
    assigneeMap = new Map(),
    destinationMap = new Map(),
  ) {
    if (!row) {
      return null;
    }

    const customerId = row.customer_id ?? row.customerId ?? null;
    const customer = customerMap.get(customerId) || row.customer || null;
    const assignedTo = row.assigned_to ?? row.assignedTo ?? null;
    const assignee =
      assigneeMap.get(assignedTo) || row.assignee || row.assignedUser || null;
    const destinationId = row.destination_id ?? row.destinationId ?? null;
    const destination = destinationMap.get(destinationId) || null;

    return {
      id: row.id,
      customerId,
      fullName: customer?.fullName ?? row.full_name ?? row.fullName ?? null,
      phone: customer?.phone ?? row.phone ?? null,
      email: customer?.email ?? row.email ?? null,
      panNumber: customer?.panNumber ?? row.pan_number ?? row.panNumber ?? null,
      addressLine:
        customer?.addressLine ?? row.address_line ?? row.addressLine ?? null,
      clientCurrency:
        customer?.clientCurrency ??
        row.client_currency ??
        row.clientCurrency ??
        null,
      nationality: row.nationality ?? null,
      leadCountry:
        row.lead_country ?? row.leadCountry ?? row.country ?? null,
      country: row.lead_country ?? row.leadCountry ?? row.country ?? null,
      destinationId,
      destination: destination ? toDestinationDomain(destination) : null,
      destinationName: destination?.name ?? null,
      travelDate: row.travel_date ?? row.travelDate ?? null,
      budget: row.budget ?? null,
      adultsCount: row.adults_count ?? row.adultsCount ?? 1,
      childrenCount: row.children_count ?? row.childrenCount ?? 0,
      visaRequired: row.visa_required ?? row.visaRequired ?? false,
      leadType: row.lead_type ?? row.leadType ?? "HOLIDAY",
      preferredHotelCategory:
        row.preferred_hotel_category ?? row.preferredHotelCategory ?? null,
      travelPurpose: row.travel_purpose ?? row.travelPurpose ?? null,
      source: row.source ?? null,
      campaignId: row.campaign_id ?? row.campaignId ?? null,
      utmSource: row.utm_source ?? row.utmSource ?? null,
      utmMedium: row.utm_medium ?? row.utmMedium ?? null,
      utmCampaign: row.utm_campaign ?? row.utmCampaign ?? null,
      metaLeadId: row.meta_lead_id ?? row.metaLeadId ?? null,
      leadScore: row.lead_score ?? row.leadScore ?? 0,
      priorityLevel: row.priority_level ?? row.priorityLevel ?? 0,
      isVip: row.is_vip ?? row.isVip ?? false,
      status: row.status,
      assignedTo,
      assignedUser:
        assignee ?
          {
            id: assignee.id ?? assignedTo,
            fullName: assignee.fullName ?? null,
            email: assignee.email ?? null,
          }
        : null,
      assignedAt: row.assigned_at ?? row.assignedAt ?? null,
      responseDeadline: row.response_deadline ?? row.responseDeadline ?? null,
      responseAt: row.response_at ?? row.responseAt ?? null,
      slaBreached: deriveSlaBreached(row),
      reassignmentCount: row.reassignment_count ?? row.reassignmentCount ?? 0,
      qualificationCompleted:
        row.qualification_completed ?? row.qualificationCompleted ?? false,
      closedReason: row.closed_reason ?? row.closedReason ?? null,
      nextFollowupDate: row.next_followup_date ?? row.nextFollowupDate ?? null,
      subStatus: row.sub_status ?? row.subStatus ?? null,
      temperature: row.temperature ?? null,
      followupAttempts: row.followup_attempts ?? row.followupAttempts ?? 0,
      finalReminderAt: row.final_reminder_at ?? row.finalReminderAt ?? null,
      nonResponsiveMarkedAt:
        row.non_responsive_marked_at ?? row.nonResponsiveMarkedAt ?? null,
      callsDisabled: row.calls_disabled ?? row.callsDisabled ?? false,
      isDeleted: row.is_deleted ?? row.isDeleted ?? false,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  function toFollowupDomain(row) {
    if (!row) {
      return null;
    }

    const followupType = normalizeFollowupType(
      row.followup_type ?? row.followupType,
    );

    return {
      id: row.id,
      leadId: row.lead_id ?? row.leadId,
      userId: row.user_id ?? row.userId ?? null,
      followupType: FOLLOWUP_TYPE_FROM_DB[followupType] || "CALL",
      followupTypeCode: followupType,
      followupDate: row.followup_date ?? row.followupDate ?? null,
      cadenceCode: row.cadence_code ?? row.cadenceCode ?? null,
      notes: row.notes ?? null,
      isCompleted: row.is_completed ?? row.isCompleted ?? false,
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  function toAssignableUser(row, roleName) {
    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      email: row.email ?? null,
      role: roleName ? String(roleName).toLowerCase() : null,
      country: row.agent_country ?? row.agentCountry ?? null,
      agentType: row.agent_type ?? row.agentType ?? null,
      expertiseDestinations: normalizeTextArray(
        row.expertise_destinations ?? row.expertiseDestinations,
      ),
      isActive: row.is_active ?? row.isActive ?? true,
      isOnLeave: row.is_on_leave ?? row.isOnLeave ?? false,
      active: row.active ?? null,
      lastLogin: row.last_login ?? row.lastLogin ?? null,
      incentivePercent:
        Number(row.incentive_percent ?? row.incentivePercent ?? 0) || 0,
    };
  }

  async function getTableColumns(tableName) {
    if (!canIntrospect()) {
      return null;
    }

    if (tableColumnsCache.has(tableName)) {
      return tableColumnsCache.get(tableName);
    }

    const result = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [tableName],
    );

    const columns = new Set(result.rows.map((row) => row.column_name));
    tableColumnsCache.set(tableName, columns);
    return columns;
  }

  async function hasTable(tableName) {
    if (!canIntrospect()) {
      return true;
    }

    if (tableExistsCache.has(tableName)) {
      return tableExistsCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableExistsCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableExistsCache.set(tableName, false);
      return false;
    }
  }

  async function sanitizeForTable(tableName, payload = {}) {
    const entries = Object.entries(payload).filter(
      ([, value]) => value !== undefined,
    );
    if (!entries.length) {
      return {};
    }

    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return Object.fromEntries(entries);
    }

    return Object.fromEntries(entries.filter(([key]) => columns.has(key)));
  }

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.status) {
      mapped.status = filters.status;
    }

    if (filters.source) {
      mapped.source = filters.source;
    }

    if (filters.temperature) {
      mapped.temperature = filters.temperature;
    }

    if (filters.subStatus) {
      mapped.sub_status = filters.subStatus;
    }

    if (filters.leadType) {
      mapped.lead_type = filters.leadType;
    }

    if (filters.assignedTo) {
      mapped.assigned_to = filters.assignedTo;
    }

    if (filters.destinationId) {
      mapped.destination_id = filters.destinationId;
    }

    if (filters.leadCountry || filters.country) {
      mapped.lead_country = filters.leadCountry ?? filters.country;
    }

    if (filters.campaignId) {
      mapped.campaign_id = filters.campaignId;
    }

    if (filters.page) {
      mapped.page = filters.page;
    }

    if (filters.limit) {
      mapped.limit = filters.limit;
    }

    return mapped;
  }

  async function loadRoleLookup() {
    const roleRows = await db.findMany(schema.rolesTable, {});
    const lookup = new Map();

    roleRows.forEach((row) => {
      lookup.set(row.id, row.name);
    });

    return lookup;
  }

  async function loadCustomersByIds(customerIds = []) {
    const ids = [...new Set(customerIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.customersTable, id)),
    );
    const customerMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      customerMap.set(row.id, toCustomerDomain(row));
    });

    return customerMap;
  }

  async function loadUsersByIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(ids.map((id) => db.findById(schema.usersTable, id)));
    const userMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      userMap.set(row.id, {
        id: row.id,
        fullName: row.full_name ?? row.fullName ?? null,
        email: row.email ?? null,
      });
    });

    return userMap;
  }

  async function loadDestinationsByIds(destinationIds = []) {
    const ids = [...new Set(destinationIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.destinationsTable, id)),
    );
    const destinationMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      destinationMap.set(row.id, row);
    });

    return destinationMap;
  }

  async function mapRowsToDomain(rows = []) {
    const [customerMap, assigneeMap, destinationMap] = await Promise.all([
      loadCustomersByIds(rows.map((row) => row.customer_id ?? row.customerId)),
      loadUsersByIds(rows.map((row) => row.assigned_to ?? row.assignedTo)),
      loadDestinationsByIds(
        rows.map((row) => row.destination_id ?? row.destinationId),
      ),
    ]);
    return rows.map((row) =>
      toDomain(row, customerMap, assigneeMap, destinationMap),
    );
  }

  async function mapRowToDomain(row) {
    if (!row) {
      return null;
    }
    const [customerMap, assigneeMap, destinationMap] = await Promise.all([
      loadCustomersByIds([row.customer_id ?? row.customerId]),
      loadUsersByIds([row.assigned_to ?? row.assignedTo]),
      loadDestinationsByIds([row.destination_id ?? row.destinationId]),
    ]);
    return toDomain(row, customerMap, assigneeMap, destinationMap);
  }

  async function findCustomerByContact({ email, phone }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const hasSoftDelete = await hasColumn(schema.customersTable, "is_deleted");

    if (normalizedEmail) {
      const row = await db.findOne(
        schema.customersTable,
        hasSoftDelete
          ? { email: normalizedEmail, is_deleted: false }
          : { email: normalizedEmail },
      );
      if (row) {
        return toCustomerDomain(row);
      }
    }

    if (normalizedPhone) {
      const row = await db.findOne(
        schema.customersTable,
        hasSoftDelete
          ? { phone: normalizedPhone, is_deleted: false }
          : { phone: normalizedPhone },
      );
      if (row) {
        return toCustomerDomain(row);
      }
    }

    return null;
  }

  async function createCustomer(payload = {}) {
    const hasSoftDelete = await hasColumn(schema.customersTable, "is_deleted");
    const fullName =
      payload.fullName ||
      (payload.email ? String(payload.email).split("@")[0] : null) ||
      payload.phone ||
      `Customer ${Date.now()}`;

    const customerPayload = {
      full_name: fullName,
      phone: normalizePhone(payload.phone),
      email: normalizeEmail(payload.email),
      pan_number: payload.panNumber || null,
      address_line: payload.addressLine || null,
      client_currency: payload.clientCurrency || null,
      preferences: payload.preferences || null,
      lifetime_value: payload.lifetimeValue ?? 0,
      segment: payload.segment || "NEW",
    };

    if (hasSoftDelete) {
      customerPayload.is_deleted = false;
    }

    const row = await db.insert(schema.customersTable, customerPayload);

    return toCustomerDomain(row);
  }

  async function updateCustomer(id, payload = {}) {
    if (!id) {
      return null;
    }

    const mapped = {};

    if (payload.fullName !== undefined) {
      mapped.full_name = payload.fullName;
    }

    if (payload.phone !== undefined) {
      mapped.phone = normalizePhone(payload.phone);
    }

    if (payload.email !== undefined) {
      mapped.email = normalizeEmail(payload.email);
    }

    if (payload.preferences !== undefined) {
      mapped.preferences = payload.preferences;
    }

    if (payload.lifetimeValue !== undefined) {
      mapped.lifetime_value = payload.lifetimeValue;
    }

    if (payload.segment !== undefined) {
      mapped.segment = payload.segment;
    }
    if (payload.panNumber !== undefined) {
      mapped.pan_number = payload.panNumber;
    }
    if (payload.addressLine !== undefined) {
      mapped.address_line = payload.addressLine;
    }
    if (payload.clientCurrency !== undefined) {
      mapped.client_currency = payload.clientCurrency;
    }

    if (!Object.keys(mapped).length) {
      const existing = await db.findById(schema.customersTable, id);
      return toCustomerDomain(existing);
    }

    const row = await db.update(schema.customersTable, id, mapped);
    return toCustomerDomain(row);
  }

  return Object.freeze({
    normalizeEmail,
    normalizePhone,
    normalizeFollowupType,

    async findAll(filters = {}) {
      const mappedFilters = mapListFilters({
        ...filters,
        page: undefined,
        limit: undefined,
      });
      const rows = await db.findMany(schema.tableName, mappedFilters);
      let filteredRows = rows;

      if (filters.email || filters.phone) {
        const customerMap = await loadCustomersByIds(
          rows.map((row) => row.customer_id ?? row.customerId),
        );
        const normalizedEmail = normalizeEmail(filters.email);
        const normalizedPhone = normalizePhone(filters.phone);

        filteredRows = rows.filter((row) => {
          const customer = customerMap.get(row.customer_id ?? row.customerId);
          if (!customer) {
            return false;
          }

          if (normalizedEmail && customer.email === normalizedEmail) {
            return true;
          }

          if (normalizedPhone && customer.phone === normalizedPhone) {
            return true;
          }

          return false;
        });
      }

      const sortedRows = [...filteredRows].sort((left, right) => {
        const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      });

      const limit = toPositiveInt(filters.limit, null);
      const page = toPositiveInt(filters.page, null);
      const offset = limit && page ? (page - 1) * limit : 0;
      const pagedRows = limit ? sortedRows.slice(offset, offset + limit) : sortedRows.slice(offset);

      return mapRowsToDomain(pagedRows);
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return mapRowToDomain(row);
    },

    async findDestinationById(id) {
      if (!id) {
        return null;
      }
      return db.findById(schema.destinationsTable, id);
    },

    async findDestinationByName(name) {
      if (!name) {
        return null;
      }
      const normalized = String(name).trim();
      if (!normalized) {
        return null;
      }

      if (db.adapter === "postgres") {
        const result = await db.query(
          `SELECT * FROM ${schema.destinationsTable} WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [normalized],
        );
        return result.rows?.[0] || null;
      }

      const rows = await db.findMany(schema.destinationsTable, {});
      return (
        rows.find(
          (row) =>
            String(row.name || "").trim().toLowerCase() ===
            normalized.toLowerCase(),
        ) || null
      );
    },

    async ensureDestinationByName(name) {
      const normalized = String(name || "").trim();
      if (!normalized) {
        return null;
      }

      const existing = await this.findDestinationByName(normalized);
      if (existing) {
        return existing;
      }

      return db.insert(schema.destinationsTable, {
        name: normalized,
        is_active: true,
      });
    },

    async findDuplicateCandidate({ email, phone }) {
      const hasLeadCustomerId = await hasColumn(
        schema.tableName,
        "customer_id",
      );

      if (hasLeadCustomerId) {
        const customer = await findCustomerByContact({ email, phone });
        if (!customer?.id) {
          return null;
        }

        const leadRows = await db.findMany(schema.tableName, {
          customer_id: customer.id,
        });

        const activeCandidate = leadRows
          .filter((row) => !(row.is_deleted ?? row.isDeleted ?? false))
          .sort((left, right) => {
            const leftTs =
              toDate(left.created_at ?? left.createdAt)?.getTime() || 0;
            const rightTs =
              toDate(right.created_at ?? right.createdAt)?.getTime() || 0;
            return rightTs - leftTs;
          })[0];

        if (!activeCandidate) {
          return null;
        }

        return toDomain(activeCandidate, new Map([[customer.id, customer]]));
      }

      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = normalizePhone(phone);

      if (normalizedEmail) {
        const byEmail = await db.findOne(schema.tableName, {
          email: normalizedEmail,
        });
        if (byEmail) {
          return mapRowToDomain(byEmail);
        }
      }

      if (normalizedPhone) {
        const byPhone = await db.findOne(schema.tableName, {
          phone: normalizedPhone,
        });
        if (byPhone) {
          return mapRowToDomain(byPhone);
        }
      }

      return null;
    },

    async findOrCreateCustomer(payload = {}) {
      const existing = await findCustomerByContact({
        email: payload.email,
        phone: payload.phone,
      });

      if (existing) {
        const patch = {};
        if (!existing.fullName && payload.fullName) {
          patch.fullName = payload.fullName;
        }
        if (!existing.panNumber && payload.panNumber) {
          patch.panNumber = payload.panNumber;
        }
        if (!existing.addressLine && payload.addressLine) {
          patch.addressLine = payload.addressLine;
        }
        if (!existing.clientCurrency && payload.clientCurrency) {
          patch.clientCurrency = payload.clientCurrency;
        }

        if (Object.keys(patch).length) {
          return updateCustomer(existing.id, patch);
        }
        return existing;
      }

      return createCustomer(payload);
    },

    async updateCustomer(id, payload = {}) {
      return updateCustomer(id, payload);
    },

    async hasLeadCustomerColumn() {
      return hasColumn(schema.tableName, "customer_id");
    },

    async findActiveAssignableUsers(roleName = null) {
      const [users, roleLookup] = await Promise.all([
        db.findMany(schema.usersTable, {}),
        loadRoleLookup(),
      ]);

      const normalizedRole = roleName ?
        String(roleName).trim().toLowerCase()
      : null;

      const activeUsers = users
        .filter((row) => {
          const isActive = row.is_active ?? row.isActive ?? true;
          const isOnLeave = row.is_on_leave ?? row.isOnLeave ?? false;
          const activeToggle = row.active ?? row.active_status ?? undefined;
          const isPresenceActive =
            activeToggle === undefined ? true : Boolean(activeToggle);
          const lastLogin = row.last_login ?? row.lastLogin ?? null;
          const hasToken = Boolean(lastLogin);
          return (
            Boolean(isActive) &&
            !Boolean(isOnLeave) &&
            isPresenceActive &&
            hasToken
          );
        })
        .map((row) => {
          const roleId = row.role_id ?? row.roleId ?? null;
          const roleFromUser = row.role ? String(row.role).toLowerCase() : null;
          const roleFromLookup = roleLookup.get(roleId);
          const roleName =
            roleFromUser ||
            (roleFromLookup ? String(roleFromLookup).toLowerCase() : null);
          return toAssignableUser(row, roleName);
        });

      if (normalizedRole) {
        return activeUsers.filter((user) => user.role === normalizedRole);
      }

      const preferred = activeUsers.filter((user) =>
        ASSIGNABLE_ROLES.has(user.role),
      );
      return preferred.length ? preferred : activeUsers;
    },

    async getOpenLeadLoadByUserIds(userIds = []) {
      const idSet = new Set(userIds);
      const load = {};

      userIds.forEach((id) => {
        load[id] = 0;
      });

      if (!idSet.size) {
        return load;
      }

      const openLeads = await db.findMany(schema.tableName, { status: "OPEN" });

      openLeads.forEach((row) => {
        const assignedTo = row.assigned_to ?? row.assignedTo ?? null;
        if (assignedTo && idSet.has(assignedTo)) {
          load[assignedTo] = (load[assignedTo] || 0) + 1;
        }
      });

      return load;
    },

    async findLatestAssignedUserId(userIds = []) {
      const idSet = new Set(userIds);
      if (!idSet.size) {
        return null;
      }

      const rows = await db.findMany(schema.tableName, {});
      const relevant = rows
        .map((row) => ({
          assignedTo: row.assigned_to ?? row.assignedTo ?? null,
          assignedAt: row.assigned_at ?? row.assignedAt ?? null,
        }))
        .filter(
          (row) =>
            row.assignedTo && row.assignedAt && idSet.has(row.assignedTo),
        )
        .sort((a, b) => {
          const left = toDate(a.assignedAt)?.getTime() || 0;
          const right = toDate(b.assignedAt)?.getTime() || 0;
          return right - left;
        });

      return relevant[0]?.assignedTo || null;
    },

    async findUnassignedLeads({ limit = 50, status = "OPEN" } = {}) {
      const normalizedLimit = toPositiveInt(limit, 50);
      const rows = await db.findMany(schema.tableName, { status });

      const list = rows
        .filter((row) => !(row.assigned_to ?? row.assignedTo))
        .sort((a, b) => {
          const left = toDate(a.created_at ?? a.createdAt)?.getTime() || 0;
          const right = toDate(b.created_at ?? b.createdAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(list);
    },

    async enqueueLead({ leadId, reason } = {}) {
      if (!leadId) {
        return null;
      }
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }

      const payload = {
        lead_id: leadId,
        reason: reason || null,
        queued_at: new Date().toISOString(),
      };

      try {
        return await db.insert(tableName, payload);
      } catch (error) {
        if (error?.code === "23505") {
          return db.findOne(tableName, { lead_id: leadId });
        }
        throw error;
      }
    },

    async listQueuedLeads({ limit = 50 } = {}) {
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return [];
      }
      const normalizedLimit = toPositiveInt(limit, 50);

      if (db.adapter === "postgres") {
        const result = await db.query(
          `SELECT * FROM ${tableName} WHERE processed_at IS NULL ORDER BY queued_at ASC LIMIT $1`,
          [normalizedLimit],
        );
        return result.rows || [];
      }

      const rows = await db.findMany(tableName, {});
      return rows
        .filter((row) => !(row.processed_at ?? row.processedAt))
        .sort((left, right) => {
          const leftTime = toDate(left.queued_at ?? left.queuedAt)?.getTime() || 0;
          const rightTime = toDate(right.queued_at ?? right.queuedAt)?.getTime() || 0;
          return leftTime - rightTime;
        })
        .slice(0, normalizedLimit);
    },

    async markQueuedLeadProcessed(id) {
      if (!id) {
        return null;
      }
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }
      return db.update(tableName, id, {
        processed_at: new Date().toISOString(),
      });
    },

    async markQueuedLeadProcessedByLeadId(leadId) {
      if (!leadId) {
        return null;
      }
      const tableName = schema.queuedLeadsTable;
      const tableExists = await hasTable(tableName);
      if (!tableExists) {
        return null;
      }
      const existing = await db.findOne(tableName, { lead_id: leadId });
      if (!existing) {
        return null;
      }
      return db.update(tableName, existing.id, {
        processed_at: new Date().toISOString(),
      });
    },

    async findOverdueAssignedLeads({ inactiveMinutes = 15, limit = 50 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 50);
      const minutes = toPositiveInt(inactiveMinutes, 15, 1440);
      const cutoff = Date.now() - minutes * 60 * 1000;

      const [leadRows, activityRows] = await Promise.all([
        db.findMany(schema.tableName, { status: "OPEN" }),
        db.findMany(schema.activitiesTable, {}),
      ]);

      const latestActivityByLeadAndUser = new Map();

      activityRows.forEach((activity) => {
        const leadId = activity.lead_id ?? activity.leadId;
        const userId = activity.user_id ?? activity.userId;
        const createdAt = activity.created_at ?? activity.createdAt;
        if (!leadId || !userId || !createdAt) {
          return;
        }

        const date = toDate(createdAt);
        if (!date) {
          return;
        }

        const key = `${leadId}:${userId}`;
        const existing = latestActivityByLeadAndUser.get(key);
        if (!existing || existing.getTime() < date.getTime()) {
          latestActivityByLeadAndUser.set(key, date);
        }
      });

      const staleLeads = leadRows
        .filter((row) => {
          const assignedTo = row.assigned_to ?? row.assignedTo ?? null;
          const assignedAtRaw = row.assigned_at ?? row.assignedAt ?? null;
          const responseAt = row.response_at ?? row.responseAt ?? null;

          if (!assignedTo || !assignedAtRaw || responseAt) {
            return false;
          }

          const assignedAt = toDate(assignedAtRaw);
          if (!assignedAt || assignedAt.getTime() > cutoff) {
            return false;
          }

          const key = `${row.id}:${assignedTo}`;
          const latestActivity = latestActivityByLeadAndUser.get(key);
          if (!latestActivity) {
            return true;
          }

          return latestActivity.getTime() <= assignedAt.getTime();
        })
        .sort((a, b) => {
          const left = toDate(a.assigned_at ?? a.assignedAt)?.getTime() || 0;
          const right = toDate(b.assigned_at ?? b.assignedAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(staleLeads);
    },

    async findSlaBreachCandidates({ limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      if (db.adapter === "postgres") {
        const result = await db.query(
          `
            SELECT *
            FROM ${schema.tableName}
            WHERE status NOT IN ('CONVERTED', 'LOST')
              AND COALESCE(sla_breached, FALSE) = FALSE
              AND response_at IS NULL
              AND response_deadline IS NOT NULL
              AND response_deadline < CURRENT_TIMESTAMP
            ORDER BY response_deadline ASC
            LIMIT $1
          `,
          [normalizedLimit],
        );
        return mapRowsToDomain(result.rows || []);
      }

      const now = Date.now();

      const rows = await db.findMany(schema.tableName, {});

      const breached = rows
        .filter((row) => {
          const status = row.status;
          const responseAt = row.response_at ?? row.responseAt ?? null;
          const responseDeadline =
            row.response_deadline ?? row.responseDeadline ?? null;
          const slaBreached = row.sla_breached ?? row.slaBreached ?? false;

          if (status === "CONVERTED" || status === "LOST") {
            return false;
          }

          if (responseAt || slaBreached) {
            return false;
          }

          const deadline = toDate(responseDeadline);
          if (!deadline) {
            return false;
          }

          return deadline.getTime() < now;
        })
        .sort((a, b) => {
          const left =
            toDate(a.response_deadline ?? a.responseDeadline)?.getTime() || 0;
          const right =
            toDate(b.response_deadline ?? b.responseDeadline)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(breached);
    },

    async findNonResponsiveCandidates({ staleDays = 4, limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const normalizedStaleDays = toPositiveInt(staleDays, 4, 30);
      const cutoff = Date.now() - normalizedStaleDays * 24 * 60 * 60 * 1000;

      const rows = await db.findMany(schema.tableName, {});
      const candidates = rows
        .filter((row) => {
          const status = String(row.status || "").toUpperCase();
          if (["CONVERTED", "LOST", "NON_RESPONSIVE"].includes(status)) {
            return false;
          }

          const responseAt = row.response_at ?? row.responseAt ?? null;
          if (responseAt) {
            return false;
          }

          const markedAt =
            row.non_responsive_marked_at ?? row.nonResponsiveMarkedAt ?? null;
          if (markedAt) {
            return false;
          }

          const createdAt = toDate(row.created_at ?? row.createdAt);
          if (!createdAt || createdAt.getTime() > cutoff) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const left = toDate(a.created_at ?? a.createdAt)?.getTime() || 0;
          const right = toDate(b.created_at ?? b.createdAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(candidates);
    },

    async markSlaBreached(id) {
      const row = await db.update(schema.tableName, id, { sla_breached: true });
      return mapRowToDomain(row);
    },

    async create(payload) {
      logger.debug({ module: "leads", payload }, "Creating lead");
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.insert(schema.tableName, sanitized);
      return mapRowToDomain(row);
    },

    async update(id, payload) {
      logger.debug({ module: "leads", id, payload }, "Updating lead");
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.update(schema.tableName, id, sanitized);
      return mapRowToDomain(row);
    },

    async createActivity(payload) {
      return db.insert(schema.activitiesTable, {
        lead_id: payload.leadId,
        user_id: payload.userId || null,
        activity_type: payload.activityType,
        notes: payload.notes || null,
      });
    },

    async createFollowup(payload) {
      const row = await db.insert(schema.followupsTable, {
        lead_id: payload.leadId,
        user_id: payload.userId || null,
        followup_type: normalizeFollowupType(payload.followupType),
        followup_date: payload.followupDate,
        cadence_code: payload.cadenceCode || null,
        notes: payload.notes || null,
        is_completed: payload.isCompleted ?? false,
      });

      return toFollowupDomain(row);
    },

    async findOverdueFollowups({ limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const now = Date.now();

      const rows = await db.findMany(schema.followupsTable, {});
      const overdue = rows
        .filter((row) => {
          const isCompleted = row.is_completed ?? row.isCompleted ?? false;
          if (isCompleted) {
            return false;
          }

          const due = toDate(row.followup_date ?? row.followupDate);
          return due && due.getTime() <= now;
        })
        .sort((a, b) => {
          const left =
            toDate(a.followup_date ?? a.followupDate)?.getTime() || 0;
          const right =
            toDate(b.followup_date ?? b.followupDate)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return overdue.map((row) => toFollowupDomain(row));
    },

    async listFollowupsByLeadId(leadId) {
      const rows = await db.findMany(schema.followupsTable, { lead_id: leadId });
      return rows.map((row) => toFollowupDomain(row));
    },

    async findFollowupAlertLog({ followupId, alertType, alertDate } = {}) {
      const tableExists = await hasTable(schema.followupAlertLogsTable);
      if (!tableExists || !followupId || !alertType || !alertDate) {
        return null;
      }
      return db.findOne(schema.followupAlertLogsTable, {
        followup_id: followupId,
        alert_type: alertType,
        alert_date: alertDate,
      });
    },

    async createFollowupAlertLog(payload = {}) {
      const tableExists = await hasTable(schema.followupAlertLogsTable);
      if (!tableExists) {
        return null;
      }
      const sanitized = await sanitizeForTable(schema.followupAlertLogsTable, {
        followup_id: payload.followupId,
        alert_type: payload.alertType,
        alert_date: payload.alertDate,
        triggered_at: payload.triggeredAt || new Date().toISOString(),
        metadata: payload.metadata || {},
      });
      if (!Object.keys(sanitized).length) {
        return null;
      }
      return db.insert(schema.followupAlertLogsTable, sanitized);
    },

    async getFollowupComplianceStats(leadId) {
      const rows = await db.findMany(schema.followupsTable, { lead_id: leadId });
      const followups = rows.map((row) => toFollowupDomain(row));
      const stats = {
        total: followups.length,
        calls: 0,
        whatsapp: 0,
        finalReminders: 0,
      };

      followups.forEach((item) => {
        const type = String(item.followupType || "").toUpperCase();
        if (type === "CALL") stats.calls += 1;
        if (type === "WHATSAPP") stats.whatsapp += 1;
        if (type === "FINAL_REMINDER") stats.finalReminders += 1;
      });

      return stats;
    },

    async findCadenceCandidates({ staleDays = 4, limit = 100 } = {}) {
      const normalizedLimit = toPositiveInt(limit, 100);
      const normalizedStaleDays = toPositiveInt(staleDays, 4, 30);
      const lowerBound = Date.now() - normalizedStaleDays * 3 * 24 * 60 * 60 * 1000;

      const rows = await db.findMany(schema.tableName, {});
      const candidates = rows
        .filter((row) => {
          const status = String(row.status || "").toUpperCase();
          if (["CONVERTED", "LOST", "NON_RESPONSIVE"].includes(status)) {
            return false;
          }
          const responseAt = row.response_at ?? row.responseAt ?? null;
          if (responseAt) {
            return false;
          }

          const createdAt = toDate(row.created_at ?? row.createdAt);
          if (!createdAt) {
            return false;
          }

          return createdAt.getTime() >= lowerBound;
        })
        .sort((a, b) => {
          const left = toDate(a.created_at ?? a.createdAt)?.getTime() || 0;
          const right = toDate(b.created_at ?? b.createdAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, normalizedLimit);

      return mapRowsToDomain(candidates);
    },
  });
}

export { createLeadsRepository };
