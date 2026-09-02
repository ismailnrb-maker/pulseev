# PulseEV Project Report

**Project:** PulseEV — EV Lifecycle Management MVP  
**Report date:** 2 September 2026  
**Report type:** Current-state product and technical assessment  
**Assessment basis:** Repository source code, configuration, data templates, generated sample data, Git history, and included presentation/demo assets

---

## 1. Executive Summary

PulseEV is a responsive, browser-based operations system for maintaining a single lifecycle record for each electric vehicle after manufacture and delivery. It brings together fleet identity, customer handover, odometer readings, scheduled services, battery-recall activity, and RTO registration progress in one operational dashboard.

The MVP addresses a common early-stage EV operations problem: critical vehicle information is often split across spreadsheets, service registers, messages, and individual team members. That fragmentation makes it difficult to identify overdue services, follow battery-replacement campaigns, complete registrations, or answer a customer's question using one reliable record. PulseEV turns those disconnected activities into a VIN-centred workflow with searchable records and exception-focused views.

The current project is more than a static prototype. It contains a working single-page web interface, authenticated FastAPI endpoints, SQL persistence, browser-local fallback storage, CSV/XLSX import, JSON backup/restore, seeded demonstration data, role-restricted usage analytics, responsive styling, and deployment configuration for Vercel. The included import files contain 200 sample vehicle records: 140 CT2 and 60 CO1 profiles.

This is appropriately shaped as an MVP: it proves the end-to-end operational concept with minimal infrastructure and no front-end framework. It is suitable for demonstrations and controlled pilots. It is not yet production-ready for unrestricted use with real customer data because authentication defaults, authorization depth, validation, auditability, test coverage, privacy controls, and workflow concurrency still need hardening.

---

## 2. What the Product Is

PulseEV is an internal EV lifecycle operations dashboard. Its primary record is a vehicle profile identified by VIN and connected to:

- vehicle hardware identifiers: model, chassis/VIN, motor, controller, and battery-pack serial;
- customer and delivery information;
- current odometer value and historical kilometer log;
- four default service milestones at 1,000, 5,000, 10,000, and 20,000 km;
- RTO registration status, dates, notes, and registration number;
- battery recall/campaign status, old and new pack serials, technician, replacement date, and customer handback confirmation; and
- record creation and update timestamps.

The interface turns these records into seven operational views:

1. **Dashboard Overview** — fleet KPIs, lifecycle visibility, service status, battery-campaign progress, registration distribution, and recent vehicle activity.
2. **EV Fleet Directory** — searchable and filterable fleet table with individual profile access.
3. **Vehicle Profile Details** — consolidated vehicle, customer, kilometer, service, registration, and battery history, with workflow actions.
4. **Service Center** — all service milestones grouped by completed, upcoming, overdue, or not due, with completion logging.
5. **Battery Recall Campaigns** — affected vehicles, campaign completion, serial swaps, in-progress work, and handback confirmation.
6. **RTO Registration Pipeline** — a four-stage Kanban-style flow from handover through document collection and submission to completed registration.
7. **Odometer Intelligence** — total and average fleet distance, high/low runners, service forecasts, and kilometer updates.

A master-only **Usage & Pilot Analytics** view also reports site opens, active sessions, aggregate usage time, usage by user, approximate access location, and recent session logs.

---

## 3. What Has Been Done

### 3.1 Product functionality implemented

| Area | Current implementation |
|---|---|
| Authentication | Username/password login, bcrypt password hashing, 24-hour JWT access tokens, pilot and master roles, and sign-out. |
| Fleet records | Create, read, update, delete, search, and filter vehicle profiles; VIN uniqueness is enforced by the API/database. |
| Service management | Four mileage milestones per vehicle; completed, upcoming, overdue, and not-due classification; technician, date, odometer, issues, and actions captured. |
| Battery campaigns | Recall targeting by VIN, campaign ID, affected status, pending/in-progress/completed states, pack serial replacement, technician, replacement date, and handback confirmation. |
| Registration | Four-stage RTO pipeline: delivered, documents pending, submitted, and completed; stage dates, notes, and registration plate captured. |
| Kilometer tracking | Current odometer, monthly logs, total/average distance, runner comparisons, and next-service forecasts. |
| Operational visibility | Dashboard KPIs and badges highlight overdue service work, pending battery work, registration progress, and minimum profile completeness. |
| Data onboarding | Bulk upsert from CSV or XLSX, using VIN to decide whether to create or update a profile. |
| Portability | Downloadable XLSX template, 200-row CSV/XLSX sample data, and JSON export/restore from the UI. |
| Pilot analytics | Session start, heartbeat, duration, user ranking, location summary, and recent-session reporting restricted to the master role. |
| Resilience | API-backed mode for shared persistence and browser-local offline mode with seed data when the API is unavailable. |
| Delivery | Vercel routing, FastAPI static serving for local use, a local runner, dependency manifest, responsive CSS, and presentation/video demo assets. |

### 3.2 Current data and demonstration readiness

- The database initializer creates users, session logs, and vehicles tables.
- An empty database is seeded deterministically with 200 vehicle profiles covering Indian cities, customer records, services, registration states, odometer histories, and battery-campaign states.
- The supplied import templates contain 200 rows and 21 columns.
- The current template mix is 70% CT2 and 30% CO1.
- A smaller browser-local seed set supports demonstrations when no backend is available.
- A PowerPoint pitch and multiple recorded video assets are included for stakeholder communication.

### 3.3 Technical composition

| Layer | Technology and responsibility |
|---|---|
| Presentation | HTML5 and modular vanilla JavaScript views. |
| Design | Custom CSS design system, responsive layouts, reusable cards, badges, tables, modals, Kanban, and CSS-based charts. |
| Client data layer | A central JavaScript store that synchronizes API data, calculates operational metrics, provides offline persistence, and coordinates import/export. |
| API | Python FastAPI application with health, authentication, vehicle CRUD, bulk import, and usage-tracking endpoints. |
| Persistence | SQLAlchemy models; PostgreSQL/Neon when configured and SQLite fallback otherwise. Nested lifecycle objects use JSON columns. |
| Security primitives | bcrypt password hashes, signed JWT bearer tokens, and role information embedded in the token. |
| Deployment | Vercel configuration and static-file fallback routes; Uvicorn local execution helper. |

The implementation comprises roughly 7,000 lines across Python, JavaScript, CSS, and HTML. All JavaScript source files passed `node --check` syntax validation during this assessment. Python execution was unavailable in the assessment environment, so the API was reviewed statically rather than started end to end.

---

## 4. The Problem It Solves

### 4.1 Operational problem

After an EV is delivered, several teams continue to work on the same asset. Sales or delivery teams retain customer and handover data; service teams monitor odometer-driven maintenance; technical teams execute battery recalls; and administration follows RTO registration. When each workflow uses its own spreadsheet or message thread, the organization loses a dependable, current view of the vehicle.

That fragmentation creates concrete risks:

- services are discovered only after their due kilometer threshold;
- recall-affected battery packs cannot be reliably traced from old serial to new serial;
- customer handback confirmation may be missing;
- registration cases stall without a visible owner or stage;
- customer, vehicle, and component identifiers do not reconcile across teams;
- management cannot see the size or status of the active fleet; and
- spreadsheet updates become difficult to consolidate as the fleet grows.

### 4.2 PulseEV's solution

PulseEV uses the VIN as the operational anchor and creates one shared lifecycle profile. Instead of forcing users to inspect every record, it calculates status and presents queues: overdue services, upcoming milestones, pending recalls, incomplete registrations, and incomplete profiles. Bulk import allows an existing spreadsheet-based operation to enter the system without manually recreating every vehicle.

The resulting value proposition is straightforward: **one searchable vehicle record, one view of outstanding work, and one shared operating picture across the post-delivery lifecycle.**

### 4.3 Expected business value

- Faster identification and closure of overdue service work.
- Better traceability and completion rates for safety or battery campaigns.
- Shorter registration cycle time and fewer stalled cases.
- Faster response to customer and management questions.
- Reduced spreadsheet reconciliation and duplicate entry.
- A measurable foundation for scaling fleet operations and defining service-level targets.

These are expected outcomes of the design; the repository does not yet contain pilot outcome data proving the size of each benefit.

---

## 5. Target Users

### 5.1 Primary users

**Fleet or operations coordinators** are the central target. They need a complete fleet directory, quick search, dashboard KPIs, and the ability to register or update an EV profile.

**Service managers and technicians** use the service queue, odometer thresholds, technician assignments, issue notes, and completion actions to plan and record maintenance.

**Battery campaign or quality teams** use campaign IDs, affected-vehicle lists, pack serial traceability, replacement execution, and customer confirmation to close recalls safely.

**Registration/RTO coordinators** use the staged pipeline to move cases from delivery to documentation, submission, and completed registration.

### 5.2 Secondary users

**Pilot administrators and operational leadership** use aggregate fleet visibility and master-only adoption analytics to review work status and whether the tool is being used.

**Customer-support staff** can search by customer, VIN, phone, registration number, or battery serial to answer lifecycle questions, although a dedicated support role is not yet implemented.

### 5.3 User and market assumptions

The sample data, phone formats, Indian cities, state registration prefixes, and explicit RTO workflow indicate that the MVP is aimed at an Indian EV manufacturer, distributor, dealership network, or fleet operator. The CT2 and CO1 model labels imply a focused initial product portfolio rather than a manufacturer-neutral platform. These target-market conclusions are inferred from the implementation because no separate PRD or market-research document exists in the repository.

---

## 6. How the MVP Was Approached

### 6.1 Start with the lifecycle record

The MVP first defines a single vehicle object broad enough to support the main post-delivery workflows. This avoids building independent service, registration, and recall databases before the operational model has been validated.

### 6.2 Organize the interface around daily jobs

Each major job has a dedicated view, while the vehicle detail page reconnects all jobs to the same asset. Dashboard cards and colored statuses make exceptions visible without requiring specialist reporting tools. The responsive sidebar and mobile breakpoints allow use on laptops and smaller field devices.

### 6.3 Use simple rules to make the data actionable

The MVP favors understandable operational rules:

- a service is completed when a completion odometer exists;
- it is upcoming within 500 km of its threshold;
- it is overdue after the threshold is passed;
- registration follows four named stages;
- battery work follows not affected, pending, in progress, and completed states; and
- minimum lifecycle visibility is counted when VIN, customer name, and delivery date are present.

These rules are intentionally easy to demonstrate and revise after user feedback.

### 6.4 Support spreadsheet migration rather than demand immediate replacement

CSV/XLSX upsert and a downloadable template reduce adoption friction. VIN-based matching lets teams load existing records and repeat imports to update them. JSON export offers a lightweight backup and portability mechanism.

### 6.5 Design for both a live pilot and a dependable demo

The same front end can use a shared API/database or switch to local browser storage. Seed data ensures that stakeholders can evaluate dashboards and workflows immediately, even without infrastructure. PostgreSQL provides the intended shared pilot path; SQLite and local storage provide fallbacks.

### 6.6 Keep the delivery stack small

Vanilla JavaScript, custom CSS, FastAPI, and SQLAlchemy keep the system understandable and inexpensive to deploy. JSON columns make changes to early lifecycle fields faster than a fully normalized schema. Vercel deployment configuration and static serving reduce operational setup for the MVP.

### 6.7 Measure pilot adoption

The master role and session heartbeat were added to answer a different MVP question: not only “does the workflow work?” but also “are pilot users opening and using it?” That is useful for validation, provided privacy and retention rules are established before broader rollout.

---

## 7. Core User Journeys

### Journey A — Add or onboard a fleet

1. A user signs in.
2. They register one EV manually or download the XLSX template.
3. A CSV/XLSX import creates new profiles and updates matching VINs.
4. The dashboard and workflow queues recalculate from the synchronized fleet.

### Journey B — Complete a scheduled service

1. The dashboard or sidebar exposes due/overdue work.
2. The service user filters the Service Center queue.
3. They log the actual odometer, date, technician, issues, and action.
4. The reading updates the vehicle profile and monthly kilometer log.

### Journey C — Execute a battery recall

1. An affected VIN is flagged against a campaign.
2. The team changes the case from pending to in progress.
3. The old/new pack serials, technician, and replacement date are recorded.
4. Customer confirmation closes the handback record.

### Journey D — Complete RTO registration

1. The delivered vehicle enters the registration board.
2. The coordinator moves it through documents pending and submitted.
3. On completion, the registration number is captured.
4. Stage dates and notes remain attached to the vehicle.

### Journey E — Review pilot adoption

1. A master user opens Usage & Pilot Analytics.
2. They review opens, active sessions, total duration, user activity, locations, and recent sessions.
3. Pilot behavior can then inform training or product iteration.

---

## 8. Architecture and Data Flow

```text
User browser
  ├─ Responsive HTML/CSS views
  ├─ JavaScript feature modules
  └─ Central Store
       ├─ Online: JWT-authenticated /api requests
       │    └─ FastAPI → SQLAlchemy → PostgreSQL/Neon or SQLite
       └─ Offline/demo: browser localStorage + local seed records

Spreadsheet (.csv/.xlsx) → authenticated import → VIN upsert → database → refreshed Store
Store → JSON export → downloadable backup
Authenticated session → tracking heartbeat → master-only usage analytics
```

The design is a modular single-page application rather than a framework-based SPA. Navigation swaps view content in the main panel. The central store owns the in-memory vehicle cache and derived KPIs, while view modules render task-specific tables, cards, and forms.

---

## 9. MVP Strengths

- **End-to-end scope:** the MVP demonstrates real create/update workflows, not only screens.
- **Clear operational model:** VIN-centred records connect vehicle, customer, service, recall, registration, and utilization data.
- **Exception-driven UI:** overdue, upcoming, pending, and completed states make daily priorities visible.
- **Low-friction onboarding:** spreadsheet templates and VIN upsert match how early operations teams commonly work.
- **Demo resilience:** local fallback and seed data make the product easy to evaluate.
- **Shared-pilot path:** JWT-protected API and PostgreSQL support multi-user persistence.
- **Role separation:** pilot users do not see master analytics.
- **Responsive design:** desktop and mobile layouts are explicitly supported.
- **Stakeholder readiness:** the repository contains pitch and demo media in addition to the working product.

---

## 10. Current Gaps and Risks

### 10.1 Must address before production use

| Risk | Current state | Required direction |
|---|---|---|
| Default credentials and secrets | Predictable seeded accounts and a fallback JWT secret exist in source. Offline login also accepts fixed credentials. | Require environment-managed secrets, remove production fallback credentials, enforce password reset, and disable offline authentication outside demo builds. |
| Authorization | Vehicle write endpoints require a token but do not distinguish permissions beyond the master analytics route. | Define roles and permissions for viewing PII, editing vehicles, service closure, recall closure, import/export, deletion, and user administration. |
| Input validation | Vehicle create/update accepts broad dictionaries with limited field validation. | Introduce Pydantic schemas, allowed-state enums, VIN/date/phone constraints, range checks, and structured error reporting. |
| Customer data protection | Names, phone numbers, locations, IP addresses, and usage logs are stored without a documented policy. | Add access controls, encryption expectations, retention/deletion policy, consent/notice, masking, and privacy review. |
| Auditability | Business edits overwrite nested JSON and do not create a durable per-action history. | Add append-only audit events with actor, timestamp, previous value, new value, and reason. |
| Testing | No automated test suite or CI configuration is present. | Add API, store-rule, import, authorization, workflow, migration, and end-to-end tests in CI. |
| Database lifecycle | Schema changes use an inline fallback alteration; SQLite under `/tmp` is ephemeral in serverless environments. | Adopt managed migrations and require durable PostgreSQL for shared deployments. |
| Deployment security | CORS is open to all origins, and the health response exposes a database URL prefix. | Restrict origins, remove connection details from public health output, add security headers, and review rate limiting. |

### 10.2 Important product and engineering limitations

- Offline and API modes have different persistence and seed scale; user expectations must make the active mode unmistakable.
- Nested services, registration history, battery history, and kilometer logs are stored as JSON, which speeds MVP development but limits reporting, integrity checks, and concurrent updates.
- Registration stages can be moved freely rather than enforcing sequence, required documents, owners, or approval rules.
- Battery and registration actions initiate asynchronous saves without consistently waiting before refreshing, which can create race conditions on slow networks.
- Import processing skips incomplete rows and returns aggregate counts, but does not provide a downloadable row-level error report.
- The UI exports customer data without a dedicated export permission or redaction option.
- “Lifecycle visibility” currently measures only VIN, customer name, and delivery date; it should not be interpreted as complete lifecycle data quality.
- Kilometer-based forecasting is intentionally simple and does not use telematics, dates, actual monthly behavior, or confidence intervals.
- Service thresholds are global defaults rather than configurable by model, region, warranty plan, or service bulletin.
- Master usage analytics depend on heartbeat timing and Vercel headers; they are pilot-adoption indicators, not a full analytics platform.
- No notifications, work ownership, SLA timers, document attachments, telematics integration, RTO integration, service-center integration, or customer communications are implemented.

---

## 11. Recommended Next Phase

### Phase 1 — Harden the pilot

1. Replace seeded/default production credentials and secret fallbacks.
2. Add typed API schemas, validation, consistent errors, and row-level import results.
3. Add granular role-based permissions and an audit event log.
4. Add automated tests for authentication, CRUD, import, service status, recall closure, registration transitions, and offline behavior.
5. Make online/offline state explicit and prevent demo mode from being enabled accidentally in production.
6. Establish privacy, retention, backup, and recovery policies.

### Phase 2 — Validate operational value

1. Pilot with a small cross-functional group from operations, service, battery/quality, and registration.
2. Measure data completeness, weekly active users, overdue service backlog, recall completion time, and registration cycle time.
3. Conduct task-based usability sessions for each core journey.
4. Refine statuses, required fields, thresholds, and dashboard definitions based on observed work.

### Phase 3 — Scale the platform

1. Normalize service events, registration events, battery campaigns, and odometer logs into reportable entities.
2. Add assignments, notifications, SLA escalation, document storage, and comments.
3. Integrate telematics/odometer feeds and relevant CRM, service, or registration systems.
4. Add organization/dealer boundaries, richer reporting, controlled exports, and production monitoring.

---

## 12. Suggested MVP Success Metrics

The next pilot should establish a baseline and target for:

- percentage of delivered EVs represented in PulseEV;
- percentage of profiles meeting an agreed completeness standard;
- overdue services and median time to close them;
- battery campaign completion and customer-confirmation rates;
- median time from delivery to completed registration;
- import success/error rate;
- weekly active operational users and repeat usage;
- average time to locate a vehicle and answer a lifecycle question; and
- number of duplicate or conflicting records found during reconciliation.

The dashboard's current “95%+ visibility” wording is a useful aspiration, but the formal pilot metric should use a broader, agreed completeness definition.

---

## 13. Repository Map

| Path | Purpose |
|---|---|
| `index.html` | Application shell, login, navigation, modal forms, and script/style loading. |
| `js/app.js` | Authentication flow, navigation, global search, forms, role-based UI, and notifications. |
| `js/store.js` | API client, offline cache, lifecycle rules, statistics, import/export, and session tracking. |
| `js/dashboard.js` | Executive operational overview. |
| `js/vehicles.js` / `js/vehicle-detail.js` | Fleet directory and consolidated lifecycle profile. |
| `js/services.js` | Service milestone queue and completion workflow. |
| `js/battery.js` | Battery recall campaign view and targeting. |
| `js/registration.js` | RTO registration Kanban workflow. |
| `js/kilometers.js` | Odometer analytics and service forecasting. |
| `js/analytics.js` | Master-only pilot usage analytics. |
| `api/index.py` | FastAPI routes, import, tracking, and static serving. |
| `api/database.py` | SQLAlchemy models, database selection, initialization, users, and 200-profile seed generation. |
| `api/auth.py` | Password hashing and JWT authentication. |
| `css/` | Design tokens, responsive layout, and reusable UI components. |
| `ev_lifecycle_template.csv/.xlsx` | Bulk onboarding templates with 200 sample records. |
| `generate_excel_template.py` | Generates the formatted workbook/template data. |
| `local_run.py` | Local development runner. |
| `vercel.json` | Vercel routing/deployment configuration. |
| `PulseEV_Executive_Pitch.pptx` and videos | Stakeholder presentation and product demonstration assets. |

---

## 14. Final Assessment

PulseEV successfully demonstrates the central MVP hypothesis: an EV operator can replace fragmented post-delivery tracking with one VIN-centred operational workspace and use status-driven queues to manage services, battery campaigns, registration, and fleet visibility.

The project's strongest choices are its coherent lifecycle data model, practical spreadsheet onboarding, exception-focused interface, and dual online/offline demonstration strategy. Those choices make the concept tangible and pilotable with limited infrastructure.

The recommended next move is not to expand feature breadth immediately. It is to harden identity, permissions, validation, audit history, privacy, database migrations, and automated testing, then run a measured pilot. If that pilot shows better lifecycle completeness and faster closure of operational exceptions, the architecture can be evolved into a production platform with normalized event data and integrations.

**Overall status:** Functional and demonstration-ready MVP; suitable for a controlled pilot after security and data-governance hardening; not yet ready for unrestricted production handling of customer data.
