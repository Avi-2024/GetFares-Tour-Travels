import { AppError } from "../errors/index.js";

/**
 * Ownership-Based Access Control Middleware
 * Ensures users can only access resources they own or are assigned to
 */

/**
 * Check if user has admin/manager level permissions
 */
function hasAdminAccess(permissions = []) {
  return (
    permissions.includes("*") ||
    permissions.some((p) => p.endsWith(":*"))
  );
}

/**
 * Generic ownership check middleware
 * @param {Object} options
 * @param {Function} options.resourceGetter - Function to fetch resource by ID
 * @param {String} options.ownerField - Field name that contains owner/assignee ID
 * @param {String} options.resourceName - Name of resource for error messages
 */
export function createOwnershipMiddleware({
  resourceGetter,
  ownerField = "assigned_to",
  resourceName = "resource",
}) {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.context?.user?.id;
      const permissions = req.context?.permissions || [];

      // Skip ownership check for admins/managers
      if (hasAdminAccess(permissions)) {
        return next();
      }

      // Fetch resource
      const resource = await resourceGetter(resourceId);
      if (!resource) {
        return next(
          new AppError(404, `${resourceName} not found`, "NOT_FOUND"),
        );
      }

      // Check ownership
      if (resource[ownerField] !== userId) {
        return next(
          new AppError(
            403,
            `You can only access your own ${resourceName}s`,
            "OWNERSHIP_REQUIRED",
          ),
        );
      }

      // Attach resource to context for reuse
      req.context.resource = resource;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Filter query based on ownership
 * Automatically adds ownership filter for non-admin users
 */
export function applyOwnershipFilter(query, context, ownerField = "assigned_to") {
  const userId = context?.user?.id;
  const permissions = context?.permissions || [];

  // Skip filter for admins/managers
  if (hasAdminAccess(permissions)) {
    return query;
  }

  // Add ownership filter
  return {
    ...query,
    [ownerField]: userId,
  };
}

/**
 * Check if user can access a specific resource
 */
export function canAccessResource(resource, context, ownerField = "assigned_to") {
  const userId = context?.user?.id;
  const permissions = context?.permissions || [];

  // Admins can access everything
  if (hasAdminAccess(permissions)) {
    return true;
  }

  // Check ownership
  return resource[ownerField] === userId;
}

/**
 * Middleware to automatically filter list queries by ownership
 */
export function createOwnershipFilterMiddleware(ownerField = "assigned_to") {
  return (req, res, next) => {
    const userId = req.context?.user?.id;
    const permissions = req.context?.permissions || [];

    // Skip filter for admins/managers
    if (hasAdminAccess(permissions)) {
      return next();
    }

    // Add ownership filter to query
    if (!req.query) {
      req.query = {};
    }
    req.query[ownerField] = userId;

    return next();
  };
}
