import bcryptjs from "bcryptjs";
import { AppError } from "../../core/errors/index.js";

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    role_id: filters.roleId,
    email: filters.email,
    is_active: filters.isActive,
    is_on_leave: filters.isOnLeave,
    active: filters.active,
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
  };
}

function mapUpdatePayload(payload) {
  return {
    role_id: payload.roleId,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    is_active: payload.isActive,
    is_on_leave: payload.isOnLeave,
    active: payload.active,
    agent_country: payload.agentCountry ?? payload.country ?? null,
    agent_type: normalizeAgentType(payload.agentType ?? payload.type),
    expertise_destinations: payload.expertiseDestinations,
    target_amount: payload.targetAmount,
    incentive_percent: payload.incentivePercent,
  };
}

function toUser(entity, roleLookup, permissions = []) {
  if (!entity) {
    return null;
  }

  const roleName = roleLookup?.get(entity.role_id) ?? entity.role ?? null;

  return {
    id: entity.id,
    roleId: entity.role_id,
    role: roleName,
    permissions,
    fullName: entity.full_name,
    email: entity.email,
    phone: entity.phone,
    agentCountry: entity.agent_country ?? entity.agentCountry ?? null,
    agentType: entity.agent_type ?? entity.agentType ?? null,
    country: entity.agent_country ?? entity.agentCountry ?? null,
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

function createUsersService({
  repository,
  logger,
  events,
  rbacService,
}) {
  function getRoleIdFromPayload(payload = {}) {
    if (Object.prototype.hasOwnProperty.call(payload, "roleId")) {
      return payload.roleId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "role_id")) {
      return payload.role_id;
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

  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug(
      { module: "users", requestId: context.requestId, filters: mappedFilters },
      "Listing records",
    );
    const rows = await repository.findAll(mappedFilters);
    const roleLookup = await getRoleLookup();
    let permissionsByUserId = new Map();
    if (rbacService) {
      permissionsByUserId = await rbacService.getPermissionsForUserIds(
        rows.map((row) => row.id),
      );
    }

    return rows.map((row) =>
      toUser(row, roleLookup, permissionsByUserId.get(row.id) || []),
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
    let permissions = [];
    if (rbacService) {
      const access = await rbacService.getPermissionsForUser({
        id: item.id,
        roleId: item.role_id,
        role: roleLookup.get(item.role_id) || null,
      });
      permissions = access.permissions;
    }

    return toUser(item, roleLookup, permissions);
  }

  async function create(payload) {
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
      const enriched = { ...payload, passwordHash, roleId };
      if (roleId && !enriched.agentCountry && !enriched.country) {
        const countryLookup = await getRoleCountryLookup();
        const roleCountry = countryLookup.get(roleId);
        if (roleCountry) {
          enriched.agentCountry = roleCountry;
        }
      }
      const created = await repository.create(
        mapCreatePayload(enriched),
      );

      events.emitCreated(created);
      const roleLookup = await getRoleLookup();
      let permissions = [];
      if (rbacService) {
        const access = await rbacService.getPermissionsForUser({
          id: created.id,
          roleId: created.role_id,
          role: roleLookup.get(created.role_id) || null,
        });
        permissions = access.permissions;
      }

      return toUser(created, roleLookup, permissions);
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
    await getById(id, context);

    try {
      const roleId = getRoleIdFromPayload(payload);
      const enriched = { ...payload, roleId };
      if (roleId && !enriched.agentCountry && !enriched.country) {
        const countryLookup = await getRoleCountryLookup();
        const roleCountry = countryLookup.get(roleId);
        if (roleCountry) {
          enriched.agentCountry = roleCountry;
        }
      }
      const updated = await repository.update(
        id,
        mapUpdatePayload(enriched),
      );

      events.emitUpdated(updated);
      const roleLookup = await getRoleLookup();
      let permissions = [];
      if (rbacService) {
        const access = await rbacService.getPermissionsForUser({
          id: updated.id,
          roleId: updated.role_id,
          role: roleLookup.get(updated.role_id) || null,
        });
        permissions = access.permissions;
      }

      return toUser(updated, roleLookup, permissions);
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
