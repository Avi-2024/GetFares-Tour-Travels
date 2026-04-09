# MySQL Compatibility Audit

Generated: 2026-04-08T09:59:45.645Z
Scope: D:\jurnary\GetFares-Tour&Travels\travel-crm\backend
Total findings: 611

## RETURNING

- Severity: high
- Count: 49

| File | Line | Sample |
|---|---:|---|
| cms/core/base/BaseClasses.js | 63 | `RETURNING` |
| cms/modules/destinations/destinations.repository.js | 44 | `RETURNING` |
| cms/modules/destinations/destinations.repository.js | 70 | `RETURNING` |
| cms/modules/destinations/destinations.repository.js | 104 | `RETURNING` |
| cms/modules/experience/experience.repository.js | 71 | `RETURNING` |
| cms/modules/experience/experience.repository.js | 113 | `RETURNING` |
| cms/modules/packages/packages.repository.js | 113 | `RETURNING` |
| cms/modules/packages/packages.repository.js | 147 | `RETURNING` |
| cms/modules/visa/visa.repository.js | 105 | `RETURNING` |
| crm/core/database/connection.js | 135 | `RETURNING` |
| crm/core/database/connection.js | 340 | `RETURNING` |
| crm/core/database/connection.js | 350 | `RETURNING` |
| crm/core/database/connection.js | 426 | `RETURNING` |
| crm/core/database/connection.js | 521 | `RETURNING` |
| crm/core/database/connection.js | 538 | `RETURNING` |
| crm/core/database/connection.js | 557 | `RETURNING` |
| crm/core/database/connection.js | 599 | `RETURNING` |
| crm/core/database/connection.js | 716 | `RETURNING` |
| crm/modules/notifications/notifications.repository.js | 131 | `RETURNING` |
| crm/modules/notifications/notifications.repository.js | 219 | `returning` |
| crm/modules/notifications/notifications.repository.js | 239 | `returning` |
| crm/modules/notifications/notifications.repository.js | 275 | `returning` |
| crm/modules/quotations/quotations.repository.js | 974 | `RETURNING` |
| crm/modules/rbac/rbac.repository.js | 176 | `RETURNING` |
| crm/modules/rbac/rbac.repository.js | 471 | `RETURNING` |
| crm/modules/suppliers/suppliers.repository.js | 656 | `RETURNING` |
| crm/modules/suppliers/suppliers.repository.js | 678 | `RETURNING` |
| scripts/cms-seed.js | 35 | `RETURNING` |
| scripts/cms-seed.js | 144 | `RETURNING` |
| scripts/cms-seed.js | 167 | `RETURNING` |
| scripts/cms-seed.js | 277 | `RETURNING` |
| scripts/delete-users-without-role.js | 124 | `RETURNING` |
| scripts/mysql-audit.js | 14 | `RETURNING` |
| scripts/seed-dummy-data.js | 90 | `returning` |
| scripts/seed-dummy-data.js | 91 | `returning` |
| scripts/seed-dummy-data.js | 92 | `returning` |
| scripts/seed-dummy-data.js | 93 | `returning` |
| scripts/seed-dummy-data.js | 94 | `RETURNING` |
| scripts/seed-dummy-data.js | 638 | `returning` |
| scripts/seed-dummy-data.js | 655 | `returning` |
| scripts/seed-dummy-data.js | 819 | `returning` |
| scripts/seed-dummy-data.js | 926 | `returning` |
| scripts/seed-rbac.js | 65 | `RETURNING` |
| scripts/seed-rbac.js | 96 | `RETURNING` |
| scripts/seed-rbac.js | 109 | `RETURNING` |
| scripts/seed-roles-users.js | 206 | `RETURNING` |
| scripts/seed-roles-users.js | 222 | `RETURNING` |
| scripts/seed-roles-users.js | 267 | `RETURNING` |
| scripts/test-sprint7.js | 333 | `RETURNING` |

## TYPE_CAST

- Severity: high
- Count: 280

| File | Line | Sample |
|---|---:|---|
| crm/core/automation/scheduler.js | 118 | `::bigint` |
| crm/core/automation/scheduler.js | 133 | `::bigint` |
| crm/core/database/connection.js | 206 | `::jsonb` |
| crm/modules/bookings/bookings.repository.js | 668 | `::int` |
| crm/modules/bookings/bookings.repository.js | 669 | `::int` |
| crm/modules/bookings/bookings.repository.js | 670 | `::int` |
| crm/modules/bookings/bookings.repository.js | 671 | `::int` |
| crm/modules/bookings/bookings.repository.js | 672 | `::int` |
| crm/modules/bookings/bookings.repository.js | 673 | `::numeric` |
| crm/modules/bookings/bookings.repository.js | 674 | `::numeric` |
| crm/modules/bookings/bookings.repository.js | 675 | `::int` |
| crm/modules/bookings/bookings.repository.js | 952 | `::int` |
| crm/modules/countries/countries.repository.js | 111 | `::int` |
| crm/modules/countries/countries.repository.js | 116 | `::int` |
| crm/modules/customers/customers.repository.js | 132 | `::text` |
| crm/modules/customers/customers.repository.js | 133 | `::int` |
| crm/modules/customers/customers.repository.js | 134 | `::timestamp` |
| crm/modules/customers/customers.repository.js | 136 | `::text` |
| crm/modules/customers/customers.repository.js | 137 | `::timestamp` |
| crm/modules/customers/customers.repository.js | 142 | `::uuid` |
| crm/modules/dashboard/dashboard.repository.js | 478 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 484 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 491 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 495 | `::text` |
| crm/modules/dashboard/dashboard.repository.js | 495 | `::text` |
| crm/modules/dashboard/dashboard.repository.js | 499 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 508 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 515 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 523 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 526 | `::date` |
| crm/modules/dashboard/dashboard.repository.js | 527 | `::text` |
| crm/modules/dashboard/dashboard.repository.js | 527 | `::text` |
| crm/modules/dashboard/dashboard.repository.js | 531 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 576 | `::text` |
| crm/modules/dashboard/dashboard.repository.js | 590 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 600 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 609 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 610 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 627 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 637 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 646 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 647 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 664 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 674 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 683 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 684 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 701 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 711 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 720 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 721 | `::numeric(14,2)` |
| crm/modules/dashboard/dashboard.repository.js | 765 | `::int` |
| crm/modules/dashboard/dashboard.repository.js | 770 | `::numeric` |
| crm/modules/dashboard/dashboard.repository.js | 777 | `::numeric` |
| crm/modules/destinations/destinations.repository.js | 20 | `::uuid` |
| crm/modules/leads/leads.repository.js | 924 | `::uuid` |
| crm/modules/leads/leads.repository.js | 927 | `::uuid` |
| crm/modules/leads/leads.repository.js | 969 | `::text` |
| crm/modules/leads/leads.repository.js | 1009 | `::text` |
| crm/modules/leads/leads.repository.js | 1026 | `::text` |
| crm/modules/leads/leads.repository.js | 1043 | `::date` |
| crm/modules/leads/leads.repository.js | 1048 | `::date` |
| crm/modules/leads/leads.repository.js | 1082 | `::int` |
| crm/modules/notifications/notifications.repository.js | 71 | `::text` |
| crm/modules/notifications/notifications.repository.js | 72 | `::uuid` |
| crm/modules/notifications/notifications.repository.js | 75 | `::text` |
| crm/modules/notifications/notifications.repository.js | 95 | `::int` |
| crm/modules/notifications/notifications.repository.js | 99 | `::text` |
| crm/modules/notifications/notifications.repository.js | 100 | `::uuid` |
| crm/modules/notifications/notifications.repository.js | 103 | `::text` |
| crm/modules/notifications/notifications.repository.js | 127 | `::text` |
| crm/modules/notifications/notifications.repository.js | 128 | `::uuid` |
| crm/modules/notifications/notifications.repository.js | 249 | `::int` |
| crm/modules/notifications/notifications.repository.js | 254 | `::text` |
| crm/modules/notifications/notifications.repository.js | 255 | `::uuid` |
| crm/modules/payments/payments.repository.js | 260 | `::numeric` |
| crm/modules/payments/payments.repository.js | 263 | `::int` |
| crm/modules/payments/payments.repository.js | 302 | `::numeric` |
| crm/modules/payments/payments.repository.js | 305 | `::int` |
| crm/modules/payments/payments.repository.js | 310 | `::numeric` |
| crm/modules/payments/payments.repository.js | 314 | `::int` |
| crm/modules/payments/payments.repository.js | 354 | `::numeric` |
| crm/modules/payments/payments.repository.js | 355 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1214 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1215 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1216 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1217 | `::numeric(10,2)` |
| crm/modules/quotations/quotations.repository.js | 1224 | `::numeric(10,2)` |
| crm/modules/quotations/quotations.repository.js | 1225 | `::numeric(12,2)` |
| crm/modules/quotations/quotations.repository.js | 1226 | `::numeric(8,2)` |
| crm/modules/quotations/quotations.repository.js | 1227 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1238 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1239 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1240 | `::int` |
| crm/modules/quotations/quotations.repository.js | 1241 | `::numeric(10,2)` |
| crm/modules/quotations/quotations.repository.js | 1248 | `::numeric(10,2)` |
| crm/modules/quotations/quotations.repository.js | 1249 | `::numeric(12,2)` |
| crm/modules/quotations/quotations.repository.js | 1250 | `::numeric(8,2)` |
| crm/modules/quotations/quotations.repository.js | 1251 | `::int` |
| crm/modules/rbac/rbac.repository.js | 30 | `::text` |
| crm/modules/rbac/rbac.repository.js | 81 | `::text` |
| crm/modules/rbac/rbac.repository.js | 118 | `::text` |
| crm/modules/rbac/rbac.repository.js | 169 | `::text` |
| crm/modules/rbac/rbac.repository.js | 202 | `::text` |
| crm/modules/rbac/rbac.repository.js | 250 | `::text` |
| crm/modules/rbac/rbac.repository.js | 306 | `::text` |
| crm/modules/rbac/rbac.repository.js | 361 | `::text` |
| crm/modules/rbac/rbac.repository.js | 461 | `::text` |
| crm/modules/rbac/rbac.repository.js | 610 | `::uuid` |
| crm/modules/rbac/rbac.repository.js | 704 | `::uuid` |
| crm/modules/rbac/rbac.repository.js | 769 | `::text` |
| crm/modules/rbac/rbac.repository.js | 846 | `::int` |
| crm/modules/rbac/rbac.repository.js | 904 | `::text` |
| crm/modules/reports/reports.repository.js | 57 | `::int` |
| crm/modules/reports/reports.repository.js | 58 | `::int` |
| crm/modules/reports/reports.repository.js | 101 | `::int` |
| crm/modules/reports/reports.repository.js | 102 | `::int` |
| crm/modules/reports/reports.repository.js | 109 | `::numeric(10,2)` |
| crm/modules/reports/reports.repository.js | 199 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 200 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 201 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 233 | `::int` |
| crm/modules/reports/reports.repository.js | 234 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 255 | `::int` |
| crm/modules/reports/reports.repository.js | 256 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 297 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 298 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 332 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 359 | `::int` |
| crm/modules/reports/reports.repository.js | 360 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 381 | `::int` |
| crm/modules/reports/reports.repository.js | 382 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 383 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 384 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 434 | `::int` |
| crm/modules/reports/reports.repository.js | 435 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 436 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 437 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 438 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 439 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 440 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 441 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 457 | `::int` |
| crm/modules/reports/reports.repository.js | 458 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 459 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 460 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 461 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 462 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 463 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 464 | `::numeric(14,2)` |
| crm/modules/reports/reports.repository.js | 594 | `::text` |
| ... | ... | ... and 130 more |

## JSONB

- Severity: high
- Count: 98

| File | Line | Sample |
|---|---:|---|
| crm/core/database/connection.js | 206 | `jsonb` |
| crm/modules/reports/reports.repository.js | 609 | `jsonb` |
| crm/modules/reports/reports.repository.js | 609 | `jsonb` |
| crm/modules/reports/reports.repository.js | 670 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 192 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 192 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 193 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 193 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 194 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 194 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 195 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 195 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 196 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 202 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 202 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 203 | `jsonb` |
| crm/modules/suppliers/suppliers.repository.js | 203 | `jsonb` |
| database/cms-schema.sql | 235 | `JSONB` |
| database/cms-schema.sql | 236 | `JSONB` |
| database/cms-schema.sql | 292 | `JSONB` |
| database/cms-schema.sql | 292 | `jsonb` |
| database/main-db.sql | 173 | `JSONB` |
| database/main-db.sql | 173 | `jsonb` |
| database/main-db.sql | 194 | `JSONB` |
| database/main-db.sql | 194 | `jsonb` |
| database/main-db.sql | 421 | `JSONB` |
| database/main-db.sql | 429 | `JSONB` |
| database/main-db.sql | 509 | `JSONB` |
| database/main-db.sql | 510 | `JSONB` |
| database/main-db.sql | 522 | `JSONB` |
| database/main-db.sql | 531 | `JSONB` |
| database/main-db.sql | 815 | `JSONB` |
| database/main-db.sql | 913 | `JSONB` |
| database/main-db.sql | 914 | `JSONB` |
| database/migrations/001_add_crm_package_fields.sql | 20 | `JSONB` |
| database/migrations/001_add_crm_package_fields.sql | 22 | `JSONB` |
| database/migrations/001_add_crm_package_fields.sql | 22 | `jsonb` |
| database/migrations/001_initial_schema.sql | 515 | `JSONB` |
| database/migrations/001_initial_schema.sql | 516 | `JSONB` |
| database/migrations/003_quotation_engine_sprint3.sql | 28 | `JSONB` |
| database/migrations/003_quotation_engine_sprint3.sql | 134 | `JSONB` |
| database/migrations/003_quotation_engine_sprint3.sql | 135 | `JSONB` |
| database/migrations/003_quotation_engine_sprint3.sql | 147 | `JSONB` |
| database/migrations/003_quotation_engine_sprint3.sql | 156 | `JSONB` |
| database/migrations/004_notifications_socketio_mvp.sql | 9 | `JSONB` |
| database/migrations/004_notifications_socketio_mvp.sql | 9 | `jsonb` |
| database/migrations/006_prd_completion_modules.sql | 98 | `JSONB` |
| database/migrations/008_settings_module.sql | 7 | `JSONB` |
| database/migrations/008_settings_module.sql | 7 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 4 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 4 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 5 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 5 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 6 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 6 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 7 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 7 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 8 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 8 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 9 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 9 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 43 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 43 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 58 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 58 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 73 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 73 | `jsonb` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 92 | `JSONB` |
| database/migrations/012_scheduler_deadlines_and_alert_logs.sql | 92 | `jsonb` |
| database/migrations/013_leads_followup_alert_dedupe.sql | 7 | `JSONB` |
| database/migrations/013_leads_followup_alert_dedupe.sql | 7 | `jsonb` |
| database/migrations/021_leads_calls_disabled_packages_kind.sql | 8 | `JSONB` |
| database/migrations/021_leads_calls_disabled_packages_kind.sql | 8 | `jsonb` |
| database/migrations/022_quotation_manual_trip_fields.sql | 9 | `JSONB` |
| database/migrations/028_system_datetime_preferences_defaults.sql | 11 | `JSONB` |
| database/migrations/028_system_datetime_preferences_defaults.sql | 11 | `jsonb` |
| database/migrations/028_system_datetime_preferences_defaults.sql | 37 | `jsonb` |
| database/migrations/029_followups_workflow_history_and_reminders.sql | 32 | `JSONB` |
| database/migrations/029_followups_workflow_history_and_reminders.sql | 32 | `jsonb` |
| database/migrations/database.sql | 136 | `JSONB` |
| database/migrations/database.sql | 136 | `jsonb` |
| database/migrations/database.sql | 157 | `JSONB` |
| database/migrations/database.sql | 157 | `jsonb` |
| database/migrations/database.sql | 345 | `JSONB` |
| database/migrations/database.sql | 345 | `jsonb` |
| database/migrations/database.sql | 398 | `JSONB` |
| database/migrations/database.sql | 406 | `JSONB` |
| database/migrations/database.sql | 491 | `JSONB` |
| database/migrations/database.sql | 492 | `JSONB` |
| database/migrations/database.sql | 504 | `JSONB` |
| database/migrations/database.sql | 513 | `JSONB` |
| database/migrations/database.sql | 803 | `JSONB` |
| database/migrations/database.sql | 901 | `JSONB` |
| database/migrations/database.sql | 902 | `JSONB` |
| scripts/cms-seed.js | 89 | `JSONB` |
| scripts/cms-seed.js | 89 | `jsonb` |
| scripts/generate-mysql-schema.js | 59 | `jsonb` |
| scripts/mysql-audit.js | 16 | `JSONB` |

## DATE_TRUNC

- Severity: high
- Count: 42

| File | Line | Sample |
|---|---:|---|
| crm/modules/dashboard/dashboard.repository.js | 80 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 82 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 84 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 87 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 582 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 583 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 589 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 592 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 593 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 599 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 602 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 603 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 619 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 620 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 626 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 629 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 630 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 636 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 639 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 640 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 656 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 657 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 663 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 666 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 667 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 673 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 676 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 677 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 693 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 694 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 700 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 703 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 704 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 710 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 713 | `DATE_TRUNC(` |
| crm/modules/dashboard/dashboard.repository.js | 714 | `DATE_TRUNC(` |
| crm/modules/reports/reports.repository.js | 198 | `DATE_TRUNC(` |
| crm/modules/reports/reports.repository.js | 204 | `DATE_TRUNC(` |
| crm/modules/reports/reports.repository.js | 205 | `DATE_TRUNC(` |
| crm/modules/reports/reports.repository.js | 1348 | `DATE_TRUNC(` |
| crm/modules/reports/reports.repository.js | 1352 | `DATE_TRUNC(` |
| crm/modules/reports/reports.repository.js | 1353 | `DATE_TRUNC(` |

## FILTER_WHERE

- Severity: high
- Count: 0

No occurrences.

## ANY_ARRAY

- Severity: high
- Count: 25

| File | Line | Sample |
|---|---:|---|
| crm/modules/bookings/bookings.validation.js | 164 | `any(` |
| crm/modules/bookings/bookings.validation.js | 165 | `any(` |
| crm/modules/bookings/bookings.validation.js | 166 | `any(` |
| crm/modules/customers/customers.repository.js | 142 | `ANY(` |
| crm/modules/dashboard/dashboard.repository.js | 495 | `ANY(` |
| crm/modules/dashboard/dashboard.repository.js | 527 | `ANY(` |
| crm/modules/destinations/destinations.repository.js | 20 | `ANY(` |
| crm/modules/leads/leads.repository.js | 924 | `ANY(` |
| crm/modules/leads/leads.repository.js | 927 | `ANY(` |
| crm/modules/leads/leads.repository.js | 969 | `ANY(` |
| crm/modules/packages/packages.validation.js | 48 | `any(` |
| crm/modules/packages/packages.validation.js | 83 | `any(` |
| crm/modules/rbac/rbac.repository.js | 30 | `ANY(` |
| crm/modules/rbac/rbac.repository.js | 610 | `ANY(` |
| crm/modules/rbac/rbac.repository.js | 704 | `ANY(` |
| crm/modules/rbac/rbac.repository.js | 769 | `ANY(` |
| crm/modules/rbac/rbac.repository.js | 904 | `ANY(` |
| crm/modules/suppliers/suppliers.repository.js | 313 | `ANY(` |
| crm/modules/users/users.repository.js | 89 | `ANY(` |
| crm/modules/users/users.repository.js | 130 | `ANY(` |
| crm/modules/whatsapp/whatsapp.validation.js | 42 | `any(` |
| scripts/delete-users-without-role.js | 55 | `ANY(` |
| scripts/delete-users-without-role.js | 65 | `ANY(` |
| scripts/delete-users-without-role.js | 103 | `ANY(` |
| scripts/delete-users-without-role.js | 114 | `ANY(` |

## ADVISORY_LOCK

- Severity: high
- Count: 1

| File | Line | Sample |
|---|---:|---|
| crm/core/automation/scheduler.js | 118 | `pg_try_advisory_lock` |

## ON_CONFLICT

- Severity: medium
- Count: 83

| File | Line | Sample |
|---|---:|---|
| cms/modules/experience/experience.repository.js | 100 | `ON CONFLICT` |
| crm/core/security/tokenBlacklist.js | 35 | `ON CONFLICT` |
| crm/modules/rbac/rbac.repository.js | 174 | `ON CONFLICT` |
| crm/modules/rbac/rbac.repository.js | 469 | `ON CONFLICT` |
| crm/modules/rbac/rbac.repository.js | 949 | `ON CONFLICT` |
| crm/modules/rbac/rbac.repository.js | 959 | `ON CONFLICT` |
| crm/modules/rbac/rbac.repository.js | 1010 | `ON CONFLICT` |
| crm/modules/rbac/rbac.repository.js | 1020 | `ON CONFLICT` |
| crm/modules/users/users.repository.js | 200 | `ON CONFLICT` |
| database/main-db.sql | 4 | `ON CONFLICT` |
| database/main-db.sql | 8 | `ON CONFLICT` |
| database/main-db.sql | 15 | `ON CONFLICT` |
| database/main-db.sql | 23 | `ON CONFLICT` |
| database/main-db.sql | 230 | `ON CONFLICT` |
| database/migrations/008_settings_module.sql | 43 | `ON CONFLICT` |
| database/migrations/024_hierarchical_rbac_countries.sql | 68 | `ON CONFLICT` |
| database/migrations/024_hierarchical_rbac_countries.sql | 89 | `ON CONFLICT` |
| database/migrations/028_system_datetime_preferences_defaults.sql | 33 | `ON CONFLICT` |
| database/migrations/database.sql | 193 | `ON CONFLICT` |
| database/migrations/database.sql | 1137 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 23 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 37 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 51 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 62 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 73 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 84 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 106 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 116 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 122 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 128 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 134 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 140 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 146 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 152 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 164 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 179 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 200 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 217 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 234 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 251 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 268 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 285 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 302 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 319 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 329 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 335 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 341 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 347 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 353 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 363 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 369 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 375 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 385 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 391 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 397 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 403 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 409 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 422 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 470 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 489 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 504 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 519 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 529 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 535 | `ON CONFLICT` |
| database/seed-dummy-data.sql | 546 | `ON CONFLICT` |
| scripts/cms-seed.js | 31 | `ON CONFLICT` |
| scripts/cms-seed.js | 139 | `ON CONFLICT` |
| scripts/cms-seed.js | 160 | `ON CONFLICT` |
| scripts/generate-mysql-schema.js | 69 | `ON CONFLICT` |
| scripts/reseed-suppliers.js | 80 | `ON CONFLICT` |
| scripts/reseed-suppliers.js | 116 | `ON CONFLICT` |
| scripts/reseed-suppliers.js | 133 | `ON CONFLICT` |
| scripts/reseed-suppliers.js | 150 | `ON CONFLICT` |
| scripts/seed-dummy-data.js | 85 | `ON CONFLICT` |
| scripts/seed-dummy-data.js | 87 | `ON CONFLICT` |
| scripts/seed-rbac.js | 63 | `ON CONFLICT` |
| scripts/seed-rbac.js | 91 | `ON CONFLICT` |
| scripts/seed-rbac.js | 107 | `ON CONFLICT` |
| scripts/seed-rbac.js | 171 | `ON CONFLICT` |
| scripts/seed-roles-users.js | 205 | `ON CONFLICT` |
| scripts/seed-roles-users.js | 221 | `ON CONFLICT` |
| scripts/seed-roles-users.js | 245 | `ON CONFLICT` |
| scripts/seed-roles-users.js | 263 | `ON CONFLICT` |

## ILIKE

- Severity: medium
- Count: 7

| File | Line | Sample |
|---|---:|---|
| crm/modules/countries/countries.repository.js | 13 | `ILIKE` |
| crm/modules/countries/countries.repository.js | 13 | `ILIKE` |
| crm/modules/quotations/quotations.repository.js | 743 | `ILIKE` |
| crm/modules/quotations/quotations.repository.js | 747 | `ILIKE` |
| crm/modules/quotations/quotations.repository.js | 1189 | `ILIKE` |
| crm/modules/quotations/quotations.repository.js | 1193 | `ILIKE` |
| scripts/mysql-audit.js | 22 | `ILIKE` |

## INFO_SCHEMA_PUBLIC

- Severity: medium
- Count: 26

| File | Line | Sample |
|---|---:|---|
| cms/modules/landing/landing.repository.js | 18 | `table_schema = 'public'` |
| crm/core/automation/scheduler.js | 99 | `table_schema='public'` |
| crm/core/roles/roles.service.js | 21 | `table_schema='public'` |
| crm/core/roles/roles.service.js | 44 | `table_schema='public'` |
| crm/modules/auth/auth.repository.js | 18 | `table_schema = 'public'` |
| crm/modules/bookings/bookings.repository.js | 278 | `table_schema='public'` |
| crm/modules/bookings/bookings.repository.js | 307 | `table_schema='public'` |
| crm/modules/customers/customers.repository.js | 22 | `table_schema='public'` |
| crm/modules/dashboard/dashboard.repository.js | 394 | `table_schema = 'public'` |
| crm/modules/leads/leads.repository.js | 259 | `table_schema='public'` |
| crm/modules/leads/leads.repository.js | 498 | `table_schema='public'` |
| crm/modules/leads/leads.repository.js | 518 | `table_schema='public'` |
| crm/modules/payments/payments.repository.js | 112 | `table_schema='public'` |
| crm/modules/payments/payments.repository.js | 141 | `table_schema='public'` |
| crm/modules/quotations/quotations.repository.js | 94 | `table_schema='public'` |
| crm/modules/rbac/rbac.repository.js | 29 | `table_schema = 'public'` |
| crm/modules/suppliers/suppliers.repository.js | 58 | `table_schema='public'` |
| crm/modules/suppliers/suppliers.repository.js | 80 | `table_schema='public'` |
| crm/modules/visa/visa.repository.js | 68 | `table_schema='public'` |
| crm/modules/visa/visa.repository.js | 97 | `table_schema='public'` |
| database/migrations/005_set_ist_timezone.sql | 27 | `table_schema = 'public'` |
| scripts/check-db.js | 58 | `table_schema = 'public'` |
| scripts/seed-dummy-data.js | 45 | `table_schema='public'` |
| scripts/seed-dummy-data.js | 56 | `table_schema='public'` |
| scripts/seed-rbac.js | 78 | `table_schema = 'public'` |
| scripts/test-db-simple.js | 51 | `table_schema = 'public'` |

