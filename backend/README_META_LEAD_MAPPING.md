# Meta Lead Mapping (Super Admin)

Configurable mapping from Meta Lead Ads `field_data` to CRM `leads` columns, scoped by **ad**, **form**, **campaign**, **page**, or **default**.

## Migrations

```bash
mysql ... < backend/database/migrations/064_meta_lead_mapping.mysql.sql
mysql ... < backend/database/migrations/065_meta_lead_mapping_seed.mysql.sql
```

## API (super admin only)

Base: `/api/meta-lead-mappings`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/metadata` | Allowed columns, scope types, transforms |
| GET | `/profiles` | List profiles + field maps |
| GET | `/profiles/:id` | Single profile |
| POST | `/profiles` | Create profile |
| PATCH | `/profiles/:id` | Update profile |
| POST | `/profiles/:profileId/field-maps` | Add question → column map |
| PATCH | `/field-maps/:id` | Update map |
| DELETE | `/field-maps/:id` | Soft-delete map |
| POST | `/test` | Dry-run mapping (no DB write) |
| POST | `/reload-cache` | Invalidate in-memory cache (60s TTL) |

### Test mapping body

```json
{
  "metaFormId": "964456066326392",
  "fieldData": [
    { "name": "what_is_your_nationality?", "values": ["Bangladesh"] },
    { "name": "full_name", "values": ["Test User"] },
    { "name": "email", "values": ["test@example.com"] },
    { "name": "phone_number", "values": ["+971501234567"] }
  ]
}
```

## Scope priority (lower wins)

`ad` → `form` → `campaign` → `page` → `default`

Within same scope type, lower `priority` number wins.

## Security

- Only `super_admin` / `superadmin` role
- `target_column` must be in whitelist (`metaLeadMapping.constants.js`)
- Transforms are fixed enums only (no custom code)

Unmapped answers still go to `dynamic_fields` / `lead_dynamic_fields`.
