import { z } from "zod";

const permissionKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine(
    (value) => value === "*" || /^[a-z0-9_]+:[a-z0-9_*]+$/i.test(value),
    "Invalid permission key format",
  );

const baseRead = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const assignRole = z.object({
  body: z
    .object({
      userId: z.string().uuid(),
      roleId: z.string().uuid(),
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const listPermissions = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      includeInactive: z.coerce.boolean().optional(),
    })
    .optional(),
});

const createPermission = z.object({
  body: z.object({
    key: permissionKeySchema,
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updatePermission = z.object({
  body: z
    .object({
      key: permissionKeySchema.optional(),
      description: z.string().trim().max(500).nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    ),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const listRoles = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      includeInactive: z.coerce.boolean().optional(),
    })
    .optional(),
});

const createRole = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateRole = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      description: z.string().trim().max(500).nullable().optional(),
      country: z.string().trim().max(100).nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    ),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const rolePermissionPatchObject = z
  .object({
    permissionId: z.string().uuid().optional(),
    key: permissionKeySchema.optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (value) => Boolean(value.permissionId || value.key),
    "Each permission item must include permissionId or key",
  );

const rolePermissionPatchItem = z.union([
  rolePermissionPatchObject,
  permissionKeySchema,
]);

const updateRolePermissions = z.object({
  body: z
    .object({
      replace: z.boolean().optional(),
      permissionIds: z.array(z.string().uuid()).optional(),
      permissions: z.array(rolePermissionPatchItem).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.replace === true) {
        const hasPermissionIds = Array.isArray(value.permissionIds);
        const hasPermissionKeys = Array.isArray(value.permissions);
        if (!hasPermissionIds && !hasPermissionKeys) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "replace=true requires permissionIds or permissions array (empty arrays allowed)",
            path: ["permissionIds"],
          });
        }
        return;
      }

      if (!Array.isArray(value.permissions) || !value.permissions.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "permissions array is required in patch mode when replace is false",
          path: ["permissions"],
        });
      }
    }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const rolePermissionsByRole = z.object({
  body: z.object({}).optional(),
  params: z.object({
    role: z.string().trim().min(1),
  }),
  query: z.object({}).optional(),
});

const rolePermissionsById = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
});

const setRolePermissions = z.object({
  body: z.object({
    permissions: z.array(z.string().trim().min(1)).min(1),
  }),
  params: z.object({
    role: z.string().trim().min(1),
  }),
  query: z.object({}).optional(),
});

const RbacValidation = {
  assignRole,
  listPermissions,
  createPermission,
  updatePermission,
  listRoles,
  createRole,
  updateRole,
  updateRolePermissions,
  rolePermissionsById,
  rolePermissionsByRole,
  setRolePermissions,
  me: baseRead,
};

export { RbacValidation };
