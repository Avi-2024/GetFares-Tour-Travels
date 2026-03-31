## OBJECTIVE

You are a senior-level software architect and engineer. Your task is to analyze, design, and generate a production-ready implementation plan for a Travel CRM system.

The output MUST be:

* Deeply structured
* End-to-end (frontend + backend)
* Covering **minor to major flows**
* Ready to implement directly

---

## PROJECT ROOT CONTEXT

Project Path:
D:\jurnary\GetFares-Tour&Travels\travel-crm

You MUST strictly follow this structure.

---

## OUTPUT FILE REQUIREMENTS

### 1. MEMORY DOCUMENT (PRIMARY OUTPUT)

Create and maintain this file:

Path:
D:\jurnary\GetFares-Tour&Travels\travel-crm\docs\memory\system-flow.md

This file must include:

### A. SYSTEM OVERVIEW

* Architecture (Frontend + Backend + DB)
* Tech stack assumptions (React, Node, PostgreSQL/MySQL, etc.)
* Folder structure explanation

---

### B. MODULE-WISE BREAKDOWN

Each module MUST include:

1. Purpose
2. UI Flow (step-by-step)
3. API Flow (request → controller → service → DB)
4. Database Tables Used
5. Edge Cases
6. Validation Rules
7. Role/Permission checks (RBAC)

Modules to include (minimum):

* Authentication
* Users & Roles (RBAC)
* Leads Management
* Bookings / Itinerary
* Payments
* Notifications
* Activity Logs
* Dashboard

---

### C. FRONTEND FLOW (VERY DEEP)

For EACH page:

* Route path
* Component structure
* State management
* API calls (with payloads)
* Loading, error, empty states
* UI conditions based on permissions
* Form validation rules
* Re-render triggers

Example format:

Page: Create Lead

* Route: /leads/create
* Fields: name, phone, destination, budget
* API: POST /api/leads
* Flow:

  1. User fills form
  2. Validate
  3. Send request
  4. Handle response

---

### D. BACKEND FLOW (VERY DEEP)

For EACH feature:

* Route
* Controller logic
* Service logic
* DB queries
* Error handling
* Middleware (auth, RBAC)

Example:

POST /api/leads
→ authMiddleware
→ permissionMiddleware('leads:create')
→ controller
→ service
→ DB insert

---

### E. RBAC DESIGN (CRITICAL)

* Role structure
* Permission structure
* Permission naming convention (module:action)
* Middleware logic
* DB schema

---

### F. DATABASE DESIGN

For EACH table:

* Columns
* Types
* Relationships
* Indexes
* Constraints

---

## 2. DATABASE FILE UPDATE

Update this file if schema changes are required:

Path:
D:\jurnary\GetFares-Tour&Travels\travel-crm\backend\database\migrations\database.sql

Rules:

* Do NOT break existing tables
* Use ALTER TABLE where needed
* Maintain normalization
* Add indexes for performance

---

## STRICT RULES (VERY IMPORTANT)

1. DO NOT GIVE GENERIC ANSWERS
2. ALWAYS THINK LIKE A SENIOR ENGINEER
3. INCLUDE EDGE CASES
4. INCLUDE FAILURE SCENARIOS
5. KEEP SCALABILITY IN MIND
6. NO PLACEHOLDERS — USE REAL STRUCTURE
7. KEEP NAMING CONSISTENT
8. FOLLOW CLEAN ARCHITECTURE

---

## OPTIMIZATION REQUIREMENTS

* Avoid Redis unless necessary

* Suggest alternatives:

  * DB caching
  * In-memory caching
  * Queue systems (BullMQ / Kafka if needed)

* Optimize for:

  * Performance
  * Maintainability
  * Scalability

---

## CODING STYLE GUIDELINES

* Backend: Controller → Service → Repository pattern
* Frontend: Modular React components
* Use clear naming conventions
* Avoid duplication

---

## WHAT TO IMPROVE (SELF-CHECK)

Before finalizing output, ensure:

* No missing flows
* No unclear logic
* DB aligns with APIs
* Frontend matches backend
* RBAC is enforced everywhere

---

## FINAL INSTRUCTION

First:
Understand FULL system.

Then:
Design architecture.

Then:
Write memory file.

Then:
Update DB if needed.

Do NOT rush.
Think deeply.
Act like a senior architect.

---

## OPTIONAL ADVANCED ADDITIONS (RECOMMENDED)

You can further enhance output by including:

* Sequence diagrams (text-based)
* Request/Response examples
* Error codes structure
* Logging strategy
* Audit trail design

---

## RESULT EXPECTATION

Output should feel like:

* Internal engineering documentation
* Ready for direct development
* No ambiguity

---


