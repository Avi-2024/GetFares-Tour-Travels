import bcryptjs from "bcryptjs";
import { AppError } from "../../core/errors/index.js";
import {
  isSuperAdminRole,
  normalizeRoleName,
} from "../../core/constants/index.js";

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    role_id: filters.roleId,
    email: filters.email,
    is_active: filters.isActive,
    is_on_leave: filters.isOnLeave,
    active: filters.active,
    manager_id: filters.managerId,
  };
}

function normalizeAgentType(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toUpperCase();
  if (normalized.includes("VISA")) return "VISA";
  if (normalized.includes("HOLIDAY")) return "HOLIDAY";
  if (normalized === "BOTH") return "BOTH";
  return normalized;
}

function mapCreatePayload(payload) {
  const parentId = payload.parentId ?? payload.managerId ?? null;
  return {
    role_id: payload.roleId,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    password_hash: payload.passwordHash,
    is_active: payload.isActive,
    is_on_leave: payload.isOnLeave,
    active: payload.active,
    agent_country: payload.agentCountry ?? payload.country ?? null,
    agent_type: normalizeAgentType(payload.agentType ?? payload.type),
    expertise_destinations: payload.expertiseDestinations,
    target_amount: payload.targetAmount,
    incentive_percent: payload.incentivePercent,
    manager_id: parentId,
    parent_id: parentId,
  };
}

function mapUpdatePayload(payload) {
  const parentId = payload.parentId ?? payload.managerId;
  const mapped = {
    role_id: payload.roleId,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    is_active: payload.isActive,
    is_on_leave: payload.isOnLeave,
    active: payload.active,
    expertise_destinations: payload.expertiseDestinations,
    target_amount: payload.targetAmount,
    incentive_percent: payload.incentivePercent,
    manager_id: parentId,
    parent_id: parentId,
  };

  if (
    Object.prototype.hasOwnProperty.call(payload, "agentCountry") ||
    Object.prototype.hasOwnProperty.call(payload, "country")
  ) {
    mapped.agent_country = payload.agentCountry ?? payload.country ?? null;
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "agentType") ||
    Object.prototype.hasOwnProperty.call(payload, "type")
  ) {
    mapped.agent_type = normalizeAgentType(payload.agentType ?? payload.type);
  }

  return mapped;
}

function getRoleKind(roleName) {
  const normalized = normalizeRoleName(roleName);
  if (isSuperAdminRole(normalized)) {
    return "SUPERADMIN";
  }
  if (normalized.includes("manager")) {
    return "MANAGER";
  }
  if (
    normalized.includes("agent") ||
    normalized.includes("consultant") ||
    normalized.includes("executive")
  ) {
    return "AGENT";
  }
  return "OTHER";
}

function toUser(entity, roleLookup, permissions = [], countries = []) {
  if (!entity) {
    return null;
  }

  const roleName = roleLookup?.get(entity.role_id) ?? entity.role ?? null;
  const parentId =
    entity.parent_id ??
    entity.parentId ??
    entity.manager_id ??
    entity.managerId ??
    null;
  const primaryCountry =
    countries.find((country) => country.isPrimary) || countries[0] || null;

  return {
    id: entity.id,
    roleId: entity.role_id,
    role: roleName,
    permissions,
    fullName: entity.full_name,
    email: entity.email,
    phone: entity.phone,
    parentId,
    managerId: parentId,
    countries,
    countryIds: countries.map((country) => country.countryId),
    primaryCountryId: primaryCountry?.countryId || null,
    country:
      primaryCountry?.name ??
      entity.agent_country ??
      entity.agentCountry ??
      null,
    agentCountry:
      primaryCountry?.name ??
      entity.agent_country ??
      entity.agentCountry ??
      null,
    agentType: entity.agent_type ?? entity.agentType ?? null,
    type: entity.agent_type ?? entity.agentType ?? null,
    isActive: entity.is_active,
    isOnLeave: entity.is_on_leave,
    active: entity.active ?? null,
    expertiseDestinations: entity.expertise_destinations,
    targetAmount: entity.target_amount,
    incentivePercent: entity.incentive_percent,
    lastLogin: entity.last_login,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

function createUsersService({ repository, logger, events, rbacService }) {
  let parentIdColumnSupported;

  async function supportsParentIdColumn() {
    if (parentIdColumnSupported !== undefined) {
      return parentIdColumnSupported;
    }
    if (typeof repository.hasColumn !== "function") {
      parentIdColumnSupported = false;
      return parentIdColumnSupported;
    }
    parentIdColumnSupported = await repository.hasColumn(
      "users",
      "parent_id",
    );
    return parentIdColumnSupported;
  }

  function getRoleIdFromPayload(payload = {}) {
    if (Object.prototype.hasOwnProperty.call(payload, "roleId")) {
      return payload.roleId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "role_id")) {
      return payload.role_id;
    }
    return undefined;
  }

  function getParentIdFromPayload(payload = {}) {
    if (Object.prototype.hasOwnProperty.call(payload, "parentId")) {
      return payload.parentId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "parent_id")) {
      return payload.parent_id;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "managerId")) {
      return payload.managerId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "manager_id")) {
      return payload.manager_id;
    }
    return undefined;
  }

  async function getRoleLookup() {
    const roles = await repository.findRoles();
    return new Map(roles.map((role) => [role.id, role.name]));
  }

  async function getRoleCountryLookup() {
    const roles = await repository.findRoles();
    return new Map(roles.map((role) => [role.id, role.country ?? null]));
  }

  function resolveUserActiveState(payload = {}, fallback = true) {
    const isActive = payload.isActive ?? fallback;
    const active = payload.active ?? true;
    return Boolean(isActive && active);
  }

  async function ensureSingleSuperAdmin({
    roleId,
    roleName,
    excludeUserId = null,
    nextIsActive = true,
  }) {
    if (!roleId || !roleName || !isSuperAdminRole(roleName) || !nextIsActive) {
      return;
    }

    const existingCount = await repository.countActiveUsersByRoleId(roleId, {
      excludeUserId,
    });
    if (existingCount > 0) {
      throw new AppError(
        409,
        "Only one active Super Admin is allowed in the system",
        "USER_SINGLE_SUPERADMIN_ENFORCED",
      );
    }
  }

  async function resolveAndValidateCountries({
    payload,
    roleKind,
    existingCountryFallback = null,
  }) {
    const hasCountryIds = Object.prototype.hasOwnProperty.call(
      payload,
      "countryIds",
    );
    const normalizedCountryIds = hasCountryIds
      ? [...new Set((payload.countryIds || []).map((id) => String(id || "").trim()))]
          .filter(Boolean)
      : null;

    if (normalizedCountryIds && normalizedCountryIds.length) {
      const countries = await repository.findCountriesByIds(normalizedCountryIds);
      if (countries.length !== normalizedCountryIds.length) {
        throw new AppError(
          400,
          "One or more countryIds are invalid",
          "USER_INVALID_COUNTRY_IDS",
        );
      }
      const countryById = new Map(countries.map((country) => [country.id, country]));
      const primaryCountryId =
        payload.primaryCountryId &&
        countryById.has(String(payload.primaryCountryId).trim())
          ? String(payload.primaryCountryId).trim()
          : normalizedCountryIds[0];

      const primaryCountry = countryById.get(primaryCountryId) || countries[0];
      return {
        hasCountryIds,
        countryIds: normalizedCountryIds,
        primaryCountryId,
        primaryCountryName: primaryCountry?.name || null,
      };
    }

    const legacyCountry =
      payload.agentCountry ?? payload.country ?? existingCountryFallback ?? null;

    if (
      (roleKind === "MANAGER" || roleKind === "AGENT") &&
      !legacyCountry &&
      !normalizedCountryIds?.length
    ) {
      throw new AppError(
        400,
        "At least one country is required for manager/agent roles",
        "USER_COUNTRY_REQUIRED",
      );
    }

    return {
      hasCountryIds,
      countryIds: normalizedCountryIds || [],
      primaryCountryId: null,
      primaryCountryName: legacyCountry,
    };
  }

  async function validateHierarchy({
    userId = null,
    roleName,
    parentId,
    roleLookup,
  }) {
    const roleKind = getRoleKind(roleName);

    if (roleKind === "SUPERADMIN") {
      if (parentId) {
        throw new AppError(
          400,
          "Super Admin cannot have a parent manager",
          "USER_SUPERADMIN_PARENT_FORBIDDEN",
        );
      }
      return roleKind;
    }

    if (roleKind === "MANAGER") {
      if (parentId) {
        throw new AppError(
          400,
          "Manager cannot have parentId. Managers are directly under Super Admin.",
          "USER_MANAGER_PARENT_FORBIDDEN",
        );
      }
      return roleKind;
    }

    if (roleKind === "AGENT") {
      if (!parentId) {
        throw new AppError(
          400,
          "parentId (managerId) is required for agent role",
          "USER_AGENT_PARENT_REQUIRED",
        );
      }
      if (userId && String(parentId) === String(userId)) {
        throw new AppError(
          400,
          "User cannot be parent of itself",
          "USER_PARENT_SELF_REFERENCE",
        );
      }

      const manager = await repository.findById(parentId);
      if (!manager) {
        throw new AppError(404, "Manager not found", "USER_MANAGER_NOT_FOUND");
      }
      const managerRoleName = roleLookup.get(manager.role_id) || null;
      if (getRoleKind(managerRoleName) !== "MANAGER") {
        throw new AppError(
          400,
          "parentId must reference a manager user",
          "USER_PARENT_MANAGER_REQUIRED",
        );
      }
    }

    return roleKind;
  }

  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug(
      { module: "users", requestId: context.requestId, filters: mappedFilters },
      "Listing records",
    );
    const rows = await repository.findAll(mappedFilters);
    const roleLookup = await getRoleLookup();
    const [permissionsByUserId, countriesByUserId] = await Promise.all([
      rbacService
        ? rbacService.getPermissionsForUserIds(rows.map((row) => row.id))
        : Promise.resolve(new Map()),
      repository.listUserCountriesByUserIds(rows.map((row) => row.id)),
    ]);

    return rows.map((row) =>
      toUser(
        row,
        roleLookup,
        permissionsByUserId.get(row.id) || [],
        countriesByUserId.get(row.id) || [],
      ),
    );
  }

  async function listRoles() {
    const roles = await repository.findRoles();
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      value: role.name,
      description: role.description ?? null,
      country: role.country ?? null,
    }));
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "users", requestId: context.requestId, id },
      "Getting record by id",
    );
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, "Users not found", "USERS_NOT_FOUND");
    }

    const roleLookup = await getRoleLookup();
    const [permissions, countriesByUserId] = await Promise.all([
      rbacService
        ? rbacService.getPermissionsForUser({
            id: item.id,
            roleId: item.role_id,
            role: roleLookup.get(item.role_id) || null,
          }).then((access) => access.permissions)
        : Promise.resolve([]),
      repository.listUserCountriesByUserIds([item.id]),
    ]);

    return toUser(item, roleLookup, permissions, countriesByUserId.get(item.id) || []);
  }

  async function create(payload, context = {}) {
    try {
      const passwordHash =
        payload.passwordHash ||
        (payload.password ? await bcryptjs.hash(payload.password, 12) : null);

      if (!passwordHash) {
        throw new AppError(
          400,
          "Password is required",
          "USER_PASSWORD_REQUIRED",
        );
      }

      const roleId = getRoleIdFromPayload(payload);
      if (!roleId) {
        throw new AppError(400, "roleId is required", "USER_ROLE_REQUIRED");
      }

      const parentId = getParentIdFromPayload(payload);
      const enriched = {
        ...payload,
        passwordHash,
        roleId,
        parentId,
        managerId: parentId,
      };

      const roleLookup = await getRoleLookup();
      const roleName = roleLookup.get(roleId) || null;
      if (!roleName) {
        throw new AppError(404, "Role not found", "USER_ROLE_NOT_FOUND");
      }

      const roleKind = await validateHierarchy({
        roleName,
        parentId,
        roleLookup,
      });

      const actorRoleKind = getRoleKind(context.user?.role || "");
      if (context.user?.id && actorRoleKind === "AGENT") {
        throw new AppError(
          403,
          "Agents cannot create users",
          "USER_AGENT_CREATE_FORBIDDEN",
        );
      }
      if (context.user?.id && actorRoleKind === "MANAGER") {
        if (roleKind !== "AGENT") {
          throw new AppError(
            403,
            "Manager can create only agent users",
            "USER_MANAGER_CREATE_SCOPE_FORBIDDEN",
          );
        }
        if (!parentId || String(parentId) !== String(context.user.id)) {
          throw new AppError(
            403,
            "Manager can create agents only under own hierarchy",
            "USER_MANAGER_PARENT_SCOPE_FORBIDDEN",
          );
        }
      }

      if (roleId && !enriched.agentCountry && !enriched.country) {
        const countryLookup = await getRoleCountryLookup();
        const roleCountry = countryLookup.get(roleId);
        if (roleCountry) {
          enriched.agentCountry = roleCountry;
        }
      }

      const countryResolution = await resolveAndValidateCountries({
        payload: enriched,
        roleKind,
        existingCountryFallback: null,
      });
      if (countryResolution.primaryCountryName && !enriched.agentCountry) {
        enriched.agentCountry = countryResolution.primaryCountryName;
      }

      const nextIsActive = resolveUserActiveState(enriched, true);
      await ensureSingleSuperAdmin({
        roleId,
        roleName,
        nextIsActive,
      });

      const createPayload = mapCreatePayload(enriched);
      if (!(await supportsParentIdColumn())) {
        delete createPayload.parent_id;
      }
      const created = await repository.create(createPayload);

      if (countryResolution.hasCountryIds) {
        await repository.replaceUserCountries({
          userId: created.id,
          countryIds: countryResolution.countryIds,
          primaryCountryId: countryResolution.primaryCountryId,
          createdBy: context.user?.id || null,
        });
      }

      events.emitCreated(created);
      return getById(created.id, context);
    } catch (error) {
      if (error?.code === "23505") {
        throw new AppError(
          409,
          "User with this email already exists",
          "USER_EMAIL_EXISTS",
        );
      }
      throw error;
    }
  }

  async function update(id, payload, context = {}) {
    const existing = await getById(id, context);

    try {
      const roleId = getRoleIdFromPayload(payload);
      const parentId = getParentIdFromPayload(payload);
      const roleLookup = await getRoleLookup();
      const effectiveRoleId = roleId ?? existing.roleId;
      const roleName = effectiveRoleId
        ? roleLookup.get(effectiveRoleId) || null
        : null;
      if (!roleName) {
        throw new AppError(404, "Role not found", "USER_ROLE_NOT_FOUND");
      }

      const effectiveParentId =
        parentId !== undefined ? parentId : existing.parentId || null;

      const roleKind = await validateHierarchy({
        userId: id,
        roleName,
        parentId: effectiveParentId,
        roleLookup,
      });

      const actorRoleKind = getRoleKind(context.user?.role || "");
      if (context.user?.id && actorRoleKind === "AGENT") {
        throw new AppError(
          403,
          "Agents cannot update users",
          "USER_AGENT_UPDATE_FORBIDDEN",
        );
      }
      if (context.user?.id && actorRoleKind === "MANAGER") {
        const existingRoleKind = getRoleKind(existing.role || "");
        if (existingRoleKind !== "AGENT" || String(existing.parentId || "") !== String(context.user.id)) {
          throw new AppError(
            403,
            "Manager can update only own agents",
            "USER_MANAGER_UPDATE_SCOPE_FORBIDDEN",
          );
        }
        if (roleKind !== "AGENT" || String(effectiveParentId || "") !== String(context.user.id)) {
          throw new AppError(
            403,
            "Manager cannot change hierarchy outside own agent team",
            "USER_MANAGER_HIERARCHY_UPDATE_FORBIDDEN",
          );
        }
      }

      const enriched = {
        ...payload,
        roleId,
        parentId: effectiveParentId,
        managerId: effectiveParentId,
      };

      if (
        roleKind !== "AGENT" &&
        parentId === undefined &&
        existing.parentId !== null
      ) {
        enriched.parentId = null;
        enriched.managerId = null;
      }

      if (roleId && !enriched.agentCountry && !enriched.country) {
        const countryLookup = await getRoleCountryLookup();
        const roleCountry = countryLookup.get(roleId);
        if (roleCountry) {
          enriched.agentCountry = roleCountry;
        }
      }

      const countryResolution = await resolveAndValidateCountries({
        payload: enriched,
        roleKind,
        existingCountryFallback: existing.country || existing.agentCountry || null,
      });
      if (countryResolution.primaryCountryName && !enriched.agentCountry) {
        enriched.agentCountry = countryResolution.primaryCountryName;
      }

      const nextIsActive = resolveUserActiveState(
        enriched,
        Boolean(existing.isActive && (existing.active ?? true)),
      );
      await ensureSingleSuperAdmin({
        roleId: effectiveRoleId,
        roleName,
        excludeUserId: id,
        nextIsActive,
      });

      const updatePayload = mapUpdatePayload(enriched);
      if (!(await supportsParentIdColumn())) {
        delete updatePayload.parent_id;
      }
      const updated = await repository.update(id, updatePayload);

      if (countryResolution.hasCountryIds) {
        await repository.replaceUserCountries({
          userId: id,
          countryIds: countryResolution.countryIds,
          primaryCountryId: countryResolution.primaryCountryId,
          createdBy: context.user?.id || null,
        });
      }

      events.emitUpdated(updated);
      return getById(id, context);
    } catch (error) {
      if (error?.code === "23505") {
        throw new AppError(
          409,
          "User with this email already exists",
          "USER_EMAIL_EXISTS",
        );
      }
      throw error;
    }
  }

  return Object.freeze({
    list,
    getById,
    create,
    update,
    listRoles,
  });
}

export { createUsersService };
