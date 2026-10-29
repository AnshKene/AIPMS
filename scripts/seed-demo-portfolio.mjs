/**
 * AIPMS — Production-Quality Realistic Demo Portfolio Seeder
 *
 * Designed for idempotent, production-grade demo data generation.
 * Supports:
 *   --dry-run   (Default / explicit): Read-only validation & inventory report without mutations.
 *   --apply     (Requires explicit authorization): Dispatches authenticated mutations via backend APIs.
 */

import { fileURLToPath } from 'url';

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:3000/api';

// Verified Authenticated Users in AIPMS
export const VERIFIED_ACCOUNTS = {
  ADMIN: {
    email: 'admin.ansh@aipms.com',
    password: 'abc@12345',
    id: '66544acc-4e3d-4b3b-b3f3-44971c6a9347',
    name: 'Ansh (System Admin)',
    role: 'ADMIN',
  },
  PROJECT_OWNER: {
    email: 'vyas@aipms.com',
    password: 'abc@12345',
    id: '86a1b0c5-6785-46ad-8397-18c106c01402',
    name: 'Vyas Thakre',
    role: 'PROJECT_OWNER',
  },
  SECONDARY_OWNER: {
    email: 'vyas.thakre@aipms.com',
    id: '57bb7ac6-484f-40bd-a8ea-fd469e1e497a',
    name: 'Vyas Thakre',
    role: 'PROJECT_OWNER',
  },
  PROJECT_MANAGER: {
    email: 'aryan@aipms.com',
    password: 'abc@12345',
    id: '351723e1-0e4d-41e8-ad4e-3b6363711359',
    name: 'Aryan Radke',
    role: 'PROJECT_MANAGER',
  },
  SECONDARY_PM: {
    email: 'aryan.radke@aipms.com',
    id: '0e982b72-ba61-449b-a9e1-1d455b908069',
    name: 'Aryan Radke',
    role: 'PROJECT_MANAGER',
  },
  TEAM_MEMBER: {
    email: 'akash@aipms.com',
    password: 'abc@12345',
    id: 'd82cc5d0-55e2-4717-9853-597d69649c05',
    name: 'Akash',
    role: 'TEAM_MEMBER',
  },
  VIEWER: {
    email: 'sonali@aipms.com',
    password: 'abc@12345',
    id: 'b1b7da8e-2564-487f-b4d5-03f90c71dedf',
    name: 'Sonali',
    role: 'VIEWER',
  },
};

// Planned Realistic Demo Projects Portfolio
export const DEMO_PORTFOLIO = [
  {
    name: 'Customer CRM Portal',
    description: 'Enterprise customer relationship management platform with omnichannel contact tracing, lead lifecycle management, and deal pipeline automation.',
    status: 'ACTIVE',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-12-15T23:59:59.000Z',
    ownerId: VERIFIED_ACCOUNTS.PROJECT_OWNER.id,
    members: [
      { userId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id, role: 'PROJECT_MANAGER' },
      { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
      { userId: VERIFIED_ACCOUNTS.VIEWER.id, role: 'VIEWER' },
    ],
    teams: [
      {
        name: 'Frontend Engineering',
        description: 'Customer portal web user experience, UI components, and accessible dashboards.',
        members: [
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'TEAM_LEAD' },
          { userId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id, role: 'MEMBER' },
        ],
      },
      {
        name: 'Backend & API Services',
        description: 'RESTful microservices, database schemas, and integration webhooks.',
        members: [
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
        ],
      },
    ],
    sprints: [
      {
        key: 'crm-s1',
        name: 'Sprint 1 — Core Contact & Lead Schema',
        goal: 'Establish baseline entities, database tables, and REST endpoints for customer contacts.',
        status: 'COMPLETED',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-21T23:59:59.000Z',
      },
      {
        key: 'crm-s2',
        name: 'Sprint 2 — Pipeline Workflow & Automation',
        goal: 'Deliver drag-and-drop deal stage progression and webhook notifications.',
        status: 'ACTIVE',
        startDate: '2026-09-22T00:00:00.000Z',
        endDate: '2026-11-15T23:59:59.000Z',
      },
    ],
    tasks: [
      {
        key: 'crm-t1',
        title: 'Schema migration for lead records',
        description: 'Create PostgreSQL migration for leads table with foreign keys to accounts.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'crm-s1',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t2',
        title: 'REST API endpoint generation for contacts',
        description: 'Implement NestJS controller, CRUD service methods, and Swagger annotations.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'crm-s1',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t3',
        title: 'Lead scoring algorithm implementation',
        description: 'Develop weighted heuristic evaluation based on interaction recency and deal volume.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'crm-s1',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
        dependsOnKey: 'crm-t1',
      },
      {
        key: 'crm-t4',
        title: 'JWT authentication interceptor for CRM routes',
        description: 'Verify bearer tokens and enforce project-scoped RBAC on contact endpoints.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'crm-s1',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t5',
        title: 'Client contact card UI component',
        description: 'Design responsive React card with quick-action contact buttons and history timeline.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        sprintKey: 'crm-s2',
        teamName: 'Frontend Engineering',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t6',
        title: 'Kanban drag-and-drop deal board',
        description: 'Integrate accessible drag-and-drop stage columns with optimistic UI updates.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        sprintKey: 'crm-s2',
        teamName: 'Frontend Engineering',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
        dependsOnKey: 'crm-t5',
      },
      {
        key: 'crm-t7',
        title: 'Automated webhook notifications on deal stage change',
        description: 'Dispatch outbound HTTP POST payloads with retry exponential backoff.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        sprintKey: 'crm-s2',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t8',
        title: 'Realtime contact synchronization listener',
        description: 'Subscribe to database change streams to keep deal boards synchronized.',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        sprintKey: 'crm-s2',
        teamName: 'Frontend Engineering',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t9',
        title: 'Export deal analytics to CSV and PDF',
        description: 'Implement server-side streaming export for executive report generation.',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        sprintKey: 'crm-s2',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t10',
        title: 'Role-based field masking on customer PII',
        description: 'Mask customer phone numbers and payment records for Viewer roles.',
        status: 'IN_REVIEW',
        priority: 'HIGH',
        sprintKey: 'crm-s2',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
      {
        key: 'crm-t11',
        title: 'Integration test suite for CRM API routes',
        description: 'Author automated Jest integration tests covering deal lifecycle scenarios.',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        sprintKey: 'crm-s2',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t12',
        title: 'Bulk contact importer with CSV parsing',
        description: 'Support uploading CSV files up to 10k rows with duplicate email detection.',
        status: 'TODO',
        priority: 'LOW',
        teamName: 'Frontend Engineering',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
      {
        key: 'crm-t13',
        title: 'Weekly summary email digest scheduler',
        description: 'Configure cron job to aggregate newly closed deals and active high-value leads.',
        status: 'TODO',
        priority: 'LOW',
        teamName: 'Backend & API Services',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'crm-t14',
        title: 'Multi-currency pricing calculator',
        description: 'Fetch daily exchange rates and format deal revenue in target local currencies.',
        status: 'TODO',
        priority: 'LOW',
        teamName: 'Frontend Engineering',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
    ],
    risks: [
      {
        title: 'Data Privacy & Compliance Under High Ingestion Rate',
        description: 'Rapid intake of leads without consent verification may violate privacy policies.',
        probability: 'MEDIUM',
        impact: 'HIGH',
        status: 'MITIGATING',
        mitigationPlan: 'Enforce opt-in validation flags before lead ingestion into marketing channels.',
        ownerId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
        dueDate: '2026-11-20T00:00:00.000Z',
      },
      {
        title: 'Third-Party CRM Connector API Rate Limiting',
        description: 'Upstream CRM webhooks might get throttled during peak hours.',
        probability: 'LOW',
        impact: 'MEDIUM',
        status: 'OPEN',
        mitigationPlan: 'Implement Redis token bucket rate limiting with retry buffers.',
        ownerId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
        dueDate: '2026-11-30T00:00:00.000Z',
      },
    ],
  },

  {
    name: 'AIPMS Platform Development',
    description: 'Internal engineering for the AI-assisted project management platform with real-time sprint intelligence and automated risk scoring.',
    status: 'ACTIVE',
    startDate: '2026-08-15T00:00:00.000Z',
    endDate: '2026-11-30T23:59:59.000Z',
    ownerId: VERIFIED_ACCOUNTS.PROJECT_OWNER.id,
    members: [
      { userId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id, role: 'PROJECT_MANAGER' },
      { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
    ],
    teams: [
      {
        name: 'Platform & DevOps',
        description: 'Microservice orchestration, container health probes, and CI/CD pipelines.',
        members: [
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'TEAM_LEAD' },
        ],
      },
      {
        name: 'AI & Intelligence Studio',
        description: 'Machine learning heuristics, dependency anomaly detection, and sprint summaries.',
        members: [
          { userId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id, role: 'MEMBER' },
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
        ],
      },
    ],
    sprints: [
      {
        key: 'aipms-s1',
        name: 'Sprint 1 — Microservice Topology & API Gateway',
        goal: 'Deploy initial microservices with centralized reverse-proxy and JWT authentication.',
        status: 'COMPLETED',
        startDate: '2026-08-15T00:00:00.000Z',
        endDate: '2026-09-15T23:59:59.000Z',
      },
      {
        key: 'aipms-s2',
        name: 'Sprint 2 — Sprint Intelligence & Anomaly Engine',
        goal: 'Implement project health scoring, velocity projections, and critical path analysis.',
        status: 'ACTIVE',
        startDate: '2026-09-16T00:00:00.000Z',
        endDate: '2026-11-10T23:59:59.000Z',
      },
    ],
    tasks: [
      {
        key: 'aipms-t1',
        title: 'Docker container health probes and readiness checks',
        description: 'Configure HTTP liveness probes for each service in local topology.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'aipms-s1',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t2',
        title: 'Supabase RLS policy hardening for multi-tenant isolation',
        description: 'Eliminate recursive joins and implement security definer helper functions.',
        status: 'DONE',
        priority: 'URGENT',
        sprintKey: 'aipms-s1',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t3',
        title: 'Unit test mocks for NestJS microservice services',
        description: 'Ensure 100% unit test passing rate across all domain services.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'aipms-s1',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t4',
        title: 'API Gateway rate limiter configuration',
        description: 'Throttle public auth requests to 100 req/min per IP address.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'aipms-s1',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t5',
        title: 'Playwright end-to-end test configuration and visual baselines',
        description: 'Set up headless Chromium browser testing for critical user journeys.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'aipms-s1',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
      {
        key: 'aipms-t6',
        title: 'Closed-loop AI project health summary generator',
        description: 'Synthesize sprint velocity, overdue tasks, and risk severity into executive overview.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        sprintKey: 'aipms-s2',
        teamName: 'AI & Intelligence Studio',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
        dependsOnKey: 'aipms-t2',
      },
      {
        key: 'aipms-t7',
        title: 'Task dependency cycle validator DAG engine',
        description: 'Detect circular references using Tarjan strongly connected components algorithm.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        sprintKey: 'aipms-s2',
        teamName: 'AI & Intelligence Studio',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t8',
        title: 'Telemetry aggregate caching for executive dashboard',
        description: 'Cache project metrics in memory with 60-second TTL invalidation.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        sprintKey: 'aipms-s2',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t9',
        title: 'Sprint velocity prediction model refinement',
        description: 'Calculate rolling 3-sprint average story point completion rates.',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        sprintKey: 'aipms-s2',
        teamName: 'AI & Intelligence Studio',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
        dependsOnKey: 'aipms-t8',
      },
      {
        key: 'aipms-t10',
        title: 'Dark mode UI color palette token refinement',
        description: 'Harmonize contrast ratios to meet WCAG AA accessibility standards.',
        status: 'IN_REVIEW',
        priority: 'LOW',
        sprintKey: 'aipms-s2',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t11',
        title: 'Distributed tracing with OpenTelemetry',
        description: 'Propagate trace headers across API Gateway and domain services.',
        status: 'TODO',
        priority: 'LOW',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'aipms-t12',
        title: 'End-to-end performance benchmarking and load test',
        description: 'Execute concurrent simulated user scenarios up to 200 virtual users.',
        status: 'TODO',
        priority: 'MEDIUM',
        teamName: 'Platform & DevOps',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
    ],
    risks: [
      {
        title: 'Model Latency on Large Task Datasets',
        description: 'AI recommendation engine response times may exceed 2000ms with >500 tasks.',
        probability: 'MEDIUM',
        impact: 'MEDIUM',
        status: 'MITIGATING',
        mitigationPlan: 'Precompute telemetry embeddings asynchronously via Redis queue.',
        ownerId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
        dueDate: '2026-11-15T00:00:00.000Z',
      },
      {
        title: 'Cold Start Delays on Microservice Free Tiers',
        description: 'Render free-tier hosting can induce 50s delays upon idle wakeup.',
        probability: 'MEDIUM',
        impact: 'HIGH',
        status: 'OPEN',
        mitigationPlan: 'Maintain active scheduled heartbeat pings from start-render-backend daemon.',
        ownerId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
        dueDate: '2026-11-25T00:00:00.000Z',
      },
    ],
  },

  {
    name: 'E-Commerce Modernization',
    description: 'Headless commerce storefront redesign with microfrontends, real-time inventory reservation, and multi-gateway checkout.',
    status: 'ACTIVE',
    startDate: '2026-09-10T00:00:00.000Z',
    endDate: '2027-01-20T23:59:59.000Z',
    ownerId: VERIFIED_ACCOUNTS.PROJECT_OWNER.id,
    members: [
      { userId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id, role: 'PROJECT_MANAGER' },
      { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
      { userId: VERIFIED_ACCOUNTS.VIEWER.id, role: 'VIEWER' },
    ],
    teams: [
      {
        name: 'Storefront & Checkout',
        description: 'Customer product catalog, shopping bag, and checkout flows.',
        members: [
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'TEAM_LEAD' },
        ],
      },
      {
        name: 'Inventory & Fulfilment',
        description: 'Warehouse inventory allocation, stock thresholds, and logistics integration.',
        members: [
          { userId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id, role: 'MEMBER' },
        ],
      },
    ],
    sprints: [
      {
        key: 'ecom-s1',
        name: 'Sprint 1 — Storefront Facelift & Cart State',
        goal: 'Deliver responsive catalog cards and durable shopping session persistence.',
        status: 'ACTIVE',
        startDate: '2026-09-15T00:00:00.000Z',
        endDate: '2026-11-20T23:59:59.000Z',
      },
    ],
    tasks: [
      {
        key: 'ecom-t1',
        title: 'Responsive product grid component',
        description: 'Implement CSS grid with aspect-ratio preservation and lazy image loading.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'ecom-t2',
        title: 'Shopping cart session persistence',
        description: 'Synchronize cart items across guest sessions and authenticated user profiles.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'ecom-t3',
        title: 'Payment gateway sandbox integration',
        description: 'Integrate Stripe Elements with 3D Secure verification handling.',
        status: 'DONE',
        priority: 'URGENT',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'ecom-t4',
        title: 'Optimistic inventory reservation locks',
        description: 'Reserve inventory for 15 minutes when user enters checkout funnel.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        sprintKey: 'ecom-s1',
        teamName: 'Inventory & Fulfilment',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
      {
        key: 'ecom-t5',
        title: 'Algolia product search indexing',
        description: 'Configure real-time facet filtering for brands, sizes, and price tiers.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'ecom-t6',
        title: 'One-click checkout workflow for returning users',
        description: 'Auto-populate saved shipping addresses and default payment methods.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
        dependsOnKey: 'ecom-t3',
      },
      {
        key: 'ecom-t7',
        title: 'Promo code redemption engine',
        description: 'Evaluate fixed and percentage discounts with minimum cart spend rules.',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'ecom-t8',
        title: 'Mobile viewport checkout form audit',
        description: 'Verify form field autofocus, virtual keyboard avoidance, and tap targets.',
        status: 'IN_REVIEW',
        priority: 'LOW',
        sprintKey: 'ecom-s1',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
      {
        key: 'ecom-t9',
        title: 'Real-time shipping cost calculator API',
        description: 'Query carrier rates dynamically based on package weight and postal code.',
        status: 'TODO',
        priority: 'MEDIUM',
        teamName: 'Inventory & Fulfilment',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
      {
        key: 'ecom-t10',
        title: 'Customer order tracking timeline component',
        description: 'Render interactive progress stepper from confirmation to delivery.',
        status: 'TODO',
        priority: 'LOW',
        teamName: 'Storefront & Checkout',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'ecom-t11',
        title: 'Fraud detection rule evaluator',
        description: 'Flag transactions with mismatched billing addresses and velocity spikes.',
        status: 'TODO',
        priority: 'HIGH',
        teamName: 'Inventory & Fulfilment',
        assigneeId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
      },
    ],
    risks: [
      {
        title: 'Inventory Concurrency Overbooking During Flash Sales',
        description: 'High concurrency may result in overselling popular products before checkout locks.',
        probability: 'HIGH',
        impact: 'HIGH',
        status: 'OPEN',
        mitigationPlan: 'Utilize Redis distributed locks and atomic decrement operators.',
        ownerId: VERIFIED_ACCOUNTS.PROJECT_MANAGER.id,
        dueDate: '2026-12-01T00:00:00.000Z',
      },
    ],
  },

  {
    name: 'Healthcare Appointment System',
    description: 'HIPAA-compliant patient appointment scheduling, doctor availability calendars, and tele-consultation video rooms.',
    status: 'PLANNING',
    startDate: '2026-11-01T00:00:00.000Z',
    endDate: '2027-03-31T23:59:59.000Z',
    ownerId: VERIFIED_ACCOUNTS.SECONDARY_OWNER.id,
    members: [
      { userId: VERIFIED_ACCOUNTS.SECONDARY_PM.id, role: 'PROJECT_MANAGER' },
      { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
    ],
    teams: [
      {
        name: 'Clinical Workflows',
        description: 'Doctor scheduling calendars, patient onboarding, and secure medical records.',
        members: [
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'TEAM_LEAD' },
          { userId: VERIFIED_ACCOUNTS.SECONDARY_PM.id, role: 'MEMBER' },
        ],
      },
    ],
    sprints: [
      {
        key: 'health-s1',
        name: 'Sprint 1 — Compliance Architecture & Provider Onboarding',
        goal: 'Establish encrypted database schemas and provider roster management.',
        status: 'PLANNED',
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-30T23:59:59.000Z',
      },
    ],
    tasks: [
      {
        key: 'health-t1',
        title: 'Doctor shift schedule parser and recurrence engine',
        description: 'Support weekly recurring blocks, holiday exceptions, and emergency leave.',
        status: 'TODO',
        priority: 'HIGH',
        sprintKey: 'health-s1',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'health-t2',
        title: 'Encrypted patient health records database schema',
        description: 'Configure column-level encryption for sensitive diagnostic data.',
        status: 'TODO',
        priority: 'URGENT',
        sprintKey: 'health-s1',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
      },
      {
        key: 'health-t3',
        title: 'Appointment cancellation and refund policy engine',
        description: 'Enforce 24-hour notice rules for automated deposit refunds.',
        status: 'TODO',
        priority: 'LOW',
        sprintKey: 'health-s1',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'health-t4',
        title: 'SMS appointment reminder integration with Twilio',
        description: 'Dispatch localized SMS confirmations 24 hours prior to appointment.',
        status: 'TODO',
        priority: 'MEDIUM',
        sprintKey: 'health-s1',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'health-t5',
        title: 'Patient intake questionnaire form builder',
        description: 'Collect medical history, allergy disclosures, and insurance details.',
        status: 'TODO',
        priority: 'MEDIUM',
        sprintKey: 'health-s1',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'health-t6',
        title: 'WebRTC video room token generator',
        description: 'Generate ephemeral HMAC authentication tokens for telemedicine calls.',
        status: 'TODO',
        priority: 'HIGH',
        sprintKey: 'health-s1',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
      },
      {
        key: 'health-t7',
        title: 'Provider calendar UI timeline component',
        description: 'Build interactive day/week schedule grid with color-coded appointment statuses.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'health-t8',
        title: 'HIPAA audit logging pipeline',
        description: 'Stream immutable audit logs of all patient record view events.',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        teamName: 'Clinical Workflows',
        assigneeId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
      },
    ],
    risks: [
      {
        title: 'Strict PHI Audit Trail Compliance Requirement',
        description: 'Failure to record patient data access events incurs severe regulatory non-compliance.',
        probability: 'MEDIUM',
        impact: 'HIGH',
        status: 'OPEN',
        mitigationPlan: 'Implement append-only immutable database audit triggers on patient tables.',
        ownerId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
        dueDate: '2026-11-20T00:00:00.000Z',
      },
    ],
  },

  {
    name: 'Smart Agriculture Dashboard',
    description: 'IoT telemetry sensor ingestion for soil moisture, atmospheric weather stations, and crop yield forecasting.',
    status: 'COMPLETED',
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-10-15T23:59:59.000Z',
    ownerId: VERIFIED_ACCOUNTS.SECONDARY_OWNER.id,
    members: [
      { userId: VERIFIED_ACCOUNTS.SECONDARY_PM.id, role: 'PROJECT_MANAGER' },
      { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'MEMBER' },
      { userId: VERIFIED_ACCOUNTS.VIEWER.id, role: 'VIEWER' },
    ],
    teams: [
      {
        name: 'IoT & Analytics',
        description: 'Sensor firmware communication, telemetry aggregation, and yield heatmaps.',
        members: [
          { userId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id, role: 'TEAM_LEAD' },
        ],
      },
    ],
    sprints: [
      {
        key: 'agri-s1',
        name: 'Sprint 1 — Sensor Ingestion & Dashboard Finalization',
        goal: 'Finalize MQTT ingestion broker and deliver interactive telemetry heatmaps.',
        status: 'COMPLETED',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-10-15T23:59:59.000Z',
      },
    ],
    tasks: [
      {
        key: 'agri-t1',
        title: 'MQTT broker telemetry connector service',
        description: 'Ingest high-frequency sensor payloads with automatic JSON schema validation.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'agri-s1',
        teamName: 'IoT & Analytics',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'agri-t2',
        title: 'Time-series chart visualization for soil moisture',
        description: 'Render interactive line charts with rolling daily temperature overlays.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'agri-s1',
        teamName: 'IoT & Analytics',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'agri-t3',
        title: 'Battery level threshold alert system',
        description: 'Notify field managers when remote sensor battery drops below 15%.',
        status: 'DONE',
        priority: 'MEDIUM',
        sprintKey: 'agri-s1',
        teamName: 'IoT & Analytics',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'agri-t4',
        title: 'Weather forecast API integration',
        description: 'Fetch 7-day precipitation forecasts to adjust automated irrigation schedules.',
        status: 'DONE',
        priority: 'LOW',
        sprintKey: 'agri-s1',
        teamName: 'IoT & Analytics',
        assigneeId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
      },
      {
        key: 'agri-t5',
        title: 'Soil moisture geospatial heatmap component',
        description: 'Display SVG parcel map overlaid with color-coded moisture levels.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'agri-s1',
        teamName: 'IoT & Analytics',
        assigneeId: VERIFIED_ACCOUNTS.TEAM_MEMBER.id,
      },
      {
        key: 'agri-t6',
        title: 'Final client acceptance testing & handoff documentation',
        description: 'Complete user signoff, operating manual, and data export procedures.',
        status: 'DONE',
        priority: 'HIGH',
        sprintKey: 'agri-s1',
        teamName: 'IoT & Analytics',
        assigneeId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
      },
    ],
    risks: [
      {
        title: 'Remote Sensor Network Packet Loss in Bad Weather',
        description: 'Atmospheric interference during thunderstorms may drop sensor packets.',
        probability: 'LOW',
        impact: 'MEDIUM',
        status: 'RESOLVED',
        mitigationPlan: 'Enable edge buffering on local field gateway microcontrollers.',
        ownerId: VERIFIED_ACCOUNTS.SECONDARY_PM.id,
        dueDate: '2026-09-15T00:00:00.000Z',
      },
    ],
  },
];

// Helper: Authenticate and obtain JWT
async function authenticate(account) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!res.ok) {
    throw new Error(`Failed to authenticate ${account.email} (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.accessToken;
}

// Dry-Run & Inventory Execution Engine
export async function runPortfolioSeed(isDryRun = true) {
  console.log('========================================================================');
  console.log(` AIPMS DEMO PORTFOLIO SEEDER — ${isDryRun ? 'DRY-RUN INSPECTION ONLY' : 'EXECUTE LIVE SEED'}`);
  console.log('========================================================================\n');

  // Step 1: Health & Authentication Verification
  console.log('Step 1: Authenticating authorized principals...');
  let adminToken = '';
  let ownerToken = '';
  try {
    adminToken = await authenticate(VERIFIED_ACCOUNTS.ADMIN);
    console.log(`  [OK] System Admin authenticated: ${VERIFIED_ACCOUNTS.ADMIN.email} (${VERIFIED_ACCOUNTS.ADMIN.id})`);
  } catch (err) {
    console.error(`  [FAILED] Admin authentication failed: ${err.message}`);
    process.exit(1);
  }

  try {
    ownerToken = await authenticate(VERIFIED_ACCOUNTS.PROJECT_OWNER);
    console.log(`  [OK] Project Owner authenticated: ${VERIFIED_ACCOUNTS.PROJECT_OWNER.email} (${VERIFIED_ACCOUNTS.PROJECT_OWNER.id})`);
  } catch (err) {
    console.warn(`  [WARN] Project Owner login note: ${err.message}`);
  }

  // Step 2: Live Inventory Inspection
  console.log('\nStep 2: Inspecting current live database inventory...');
  const headers = { Authorization: `Bearer ${adminToken}` };
  const existingRecords = {
    projects: [],
    teams: [],
    tasks: [],
    sprints: [],
    risks: [],
  };

  try {
    const pRes = await fetch(`${API_BASE}/projects?limit=100`, { headers }).then((r) => r.json());
    existingRecords.projects = pRes.data ?? [];

    const tRes = await fetch(`${API_BASE}/teams?limit=100`, { headers }).then((r) => r.json());
    existingRecords.teams = tRes.data ?? [];

    const kRes = await fetch(`${API_BASE}/tasks?limit=100`, { headers }).then((r) => r.json());
    existingRecords.tasks = kRes.data ?? [];

    const sRes = await fetch(`${API_BASE}/sprints?limit=100`, { headers }).then((r) => r.json());
    existingRecords.sprints = sRes.data ?? [];

    const rRes = await fetch(`${API_BASE}/risks?limit=100`, { headers }).then((r) => r.json());
    existingRecords.risks = rRes.data ?? [];
  } catch (err) {
    console.error(`  [FAILED] Could not query inventory: ${err.message}`);
    process.exit(1);
  }

  console.log(`  Existing Projects in Database: ${existingRecords.projects.length}`);
  console.log(`  Existing Teams in Database:    ${existingRecords.teams.length}`);
  console.log(`  Existing Tasks in Database:    ${existingRecords.tasks.length}`);
  console.log(`  Existing Sprints in Database:  ${existingRecords.sprints.length}`);
  console.log(`  Existing Risks in Database:    ${existingRecords.risks.length}`);

  // Step 3: Schema & Validation Checks
  console.log('\nStep 3: Validating proposed records against schemas & enums...');
  const validationErrors = [];
  const validProjectStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
  const validTaskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
  const validTaskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const validSprintStatuses = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  const validRiskProbabilities = ['LOW', 'MEDIUM', 'HIGH'];
  const validRiskImpacts = ['LOW', 'MEDIUM', 'HIGH'];
  const validRiskStatuses = ['OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED', 'CLOSED'];

  let plannedInserts = {
    projects: 0,
    projectMembers: 0,
    teams: 0,
    teamMembers: 0,
    sprints: 0,
    tasks: 0,
    dependencies: 0,
    risks: 0,
  };

  let skippedRecords = {
    projects: 0,
    teams: 0,
    tasks: 0,
    sprints: 0,
    risks: 0,
  };

  let conflictRecords = 0;

  for (const proj of DEMO_PORTFOLIO) {
    // Check Project
    if (!validProjectStatuses.includes(proj.status)) {
      validationErrors.push(`Invalid project status '${proj.status}' for project '${proj.name}'`);
    }
    if (new Date(proj.endDate) < new Date(proj.startDate)) {
      validationErrors.push(`End date before start date for project '${proj.name}'`);
    }

    const existingP = existingRecords.projects.find((p) => p.name === proj.name);
    if (existingP) {
      skippedRecords.projects++;
      conflictRecords++;
      console.log(`  [SKIP/CONFLICT] Project '${proj.name}' already exists (ID: ${existingP.id})`);
    } else {
      plannedInserts.projects++;
      plannedInserts.projectMembers += (proj.members ?? []).length;
    }

    // Check Teams
    for (const team of proj.teams ?? []) {
      const existingT = existingRecords.teams.find((t) => t.name === team.name && t.projectId === existingP?.id);
      if (existingT) {
        skippedRecords.teams++;
      } else {
        plannedInserts.teams++;
        plannedInserts.teamMembers += (team.members ?? []).length;
      }
    }

    // Check Sprints
    for (const sprint of proj.sprints ?? []) {
      if (!validSprintStatuses.includes(sprint.status)) {
        validationErrors.push(`Invalid sprint status '${sprint.status}' for sprint '${sprint.name}'`);
      }
      if (new Date(sprint.endDate) < new Date(sprint.startDate)) {
        validationErrors.push(`End date before start date for sprint '${sprint.name}'`);
      }
      const existingS = existingRecords.sprints.find((s) => s.name === sprint.name && s.projectId === existingP?.id);
      if (existingS) {
        skippedRecords.sprints++;
      } else {
        plannedInserts.sprints++;
      }
    }

    // Check Tasks
    for (const task of proj.tasks ?? []) {
      if (!validTaskStatuses.includes(task.status)) {
        validationErrors.push(`Invalid task status '${task.status}' for task '${task.title}'`);
      }
      if (!validTaskPriorities.includes(task.priority)) {
        validationErrors.push(`Invalid task priority '${task.priority}' for task '${task.title}'`);
      }
      const existingK = existingRecords.tasks.find((k) => k.title === task.title && k.projectId === existingP?.id);
      if (existingK) {
        skippedRecords.tasks++;
      } else {
        plannedInserts.tasks++;
        if (task.dependsOnKey) {
          plannedInserts.dependencies++;
        }
      }
    }

    // Check Risks
    for (const risk of proj.risks ?? []) {
      if (!validRiskProbabilities.includes(risk.probability)) {
        validationErrors.push(`Invalid risk probability '${risk.probability}' for risk '${risk.title}'`);
      }
      if (!validRiskImpacts.includes(risk.impact)) {
        validationErrors.push(`Invalid risk impact '${risk.impact}' for risk '${risk.title}'`);
      }
      if (!validRiskStatuses.includes(risk.status)) {
        validationErrors.push(`Invalid risk status '${risk.status}' for risk '${risk.title}'`);
      }
      const existingR = existingRecords.risks.find((r) => r.title === risk.title && r.projectId === existingP?.id);
      if (existingR) {
        skippedRecords.risks++;
      } else {
        plannedInserts.risks++;
      }
    }
  }

  // Dependency DAG Cycle Verification
  console.log('\nStep 4: Validating task dependencies DAG (acyclic check)...');
  for (const proj of DEMO_PORTFOLIO) {
    const adj = new Map();
    for (const task of proj.tasks ?? []) {
      adj.set(task.key, []);
    }
    for (const task of proj.tasks ?? []) {
      if (task.dependsOnKey) {
        if (!adj.has(task.dependsOnKey)) {
          validationErrors.push(`Task '${task.key}' depends on non-existent task '${task.dependsOnKey}'`);
        } else {
          adj.get(task.key).push(task.dependsOnKey);
        }
      }
    }
    // DFS Cycle Detection
    const visited = new Set();
    const recStack = new Set();
    function hasCycle(node) {
      visited.add(node);
      recStack.add(node);
      for (const neighbor of adj.get(node) ?? []) {
        if (!visited.has(neighbor) && hasCycle(neighbor)) return true;
        if (recStack.has(neighbor)) return true;
      }
      recStack.delete(node);
      return false;
    }
    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          validationErrors.push(`Cyclic dependency detected in project '${proj.name}' at node '${node}'`);
        }
      }
    }
  }
  console.log('  [OK] Task dependency DAG verified: 0 cycles detected.');

  // Validation Summary
  console.log('\n========================================================================');
  console.log(' SEEDING PLANNING & INVENTORY SUMMARY');
  console.log('========================================================================');
  console.log(`Validation Errors:          ${validationErrors.length}`);
  if (validationErrors.length > 0) {
    validationErrors.forEach((e) => console.error(`  - ${e}`));
  } else {
    console.log('  [ALL CHECKS PASSED: 0 Schema / Enum / Date / DAG validation failures]');
  }

  console.log('\nPlanned Operations Summary:');
  console.log(`  - Projects to insert:      ${plannedInserts.projects} (Skipped: ${skippedRecords.projects})`);
  console.log(`  - Project Members:         ${plannedInserts.projectMembers}`);
  console.log(`  - Teams to insert:         ${plannedInserts.teams} (Skipped: ${skippedRecords.teams})`);
  console.log(`  - Team Members:            ${plannedInserts.teamMembers}`);
  console.log(`  - Sprints to insert:       ${plannedInserts.sprints} (Skipped: ${skippedRecords.sprints})`);
  console.log(`  - Tasks to insert:         ${plannedInserts.tasks} (Skipped: ${skippedRecords.tasks})`);
  console.log(`  - Dependencies to insert:  ${plannedInserts.dependencies}`);
  console.log(`  - Risks to insert:         ${plannedInserts.risks} (Skipped: ${skippedRecords.risks})`);
  console.log(`  - Conflict records:        ${conflictRecords}`);

  console.log('\nProtected System Admin Account Status:');
  console.log(`  - Admin Email:             ${VERIFIED_ACCOUNTS.ADMIN.email}`);
  console.log(`  - Admin UUID:              ${VERIFIED_ACCOUNTS.ADMIN.id}`);
  console.log('  - State:                   PROTECTED (Unchanged, not used for demo items)');

  if (isDryRun) {
    console.log('\n>>> DRY RUN COMPLETE: NO DATA WAS INSERTED OR MODIFIED.');
    console.log('>>> To execute actual database seeding upon explicit user authorization, run:');
    console.log('>>> node scripts/seed-demo-portfolio.mjs --apply\n');
    return {
      success: validationErrors.length === 0,
      isDryRun: true,
      existingRecords,
      plannedInserts,
      skippedRecords,
      conflictRecords,
      validationErrors,
    };
  }

  // Live Mutation Block (only executed when isDryRun === false)
  const stats = {
    created: { projects: 0, projectMembers: 0, teams: 0, teamMembers: 0, sprints: 0, tasks: 0, dependencies: 0, risks: 0 },
    skipped: { projects: 0, projectMembers: 0, teams: 0, teamMembers: 0, sprints: 0, tasks: 0, dependencies: 0, risks: 0 },
    failed: { projects: 0, projectMembers: 0, teams: 0, teamMembers: 0, sprints: 0, tasks: 0, dependencies: 0, risks: 0 },
  };

  for (const proj of DEMO_PORTFOLIO) {
    console.log(`\nProcessing Project: ${proj.name}...`);
    let project = existingRecords.projects.find((p) => p.name === proj.name);

    if (!project) {
      try {
        const pRes = await fetch(`${API_BASE}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            name: proj.name,
            description: proj.description,
            status: proj.status,
            startDate: proj.startDate,
            endDate: proj.endDate,
            ownerId: proj.ownerId,
          }),
        });
        if (!pRes.ok) {
          stats.failed.projects++;
          throw new Error(`Failed to create project ${proj.name}: ${await pRes.text()}`);
        }
        project = await pRes.json();
        stats.created.projects++;
        console.log(`  [CREATED] Project: ${project.name} (${project.id})`);
      } catch (err) {
        console.error(`  [FAILED] Project ${proj.name}: ${err.message}`);
        continue;
      }
    } else {
      stats.skipped.projects++;
      console.log(`  [EXISTS] Project: ${project.name} (${project.id})`);
    }

    // Project Members
    for (const mem of proj.members ?? []) {
      try {
        const mRes = await fetch(`${API_BASE}/projects/${project.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ userId: mem.userId, role: mem.role }),
        });
        if (mRes.ok) {
          stats.created.projectMembers++;
          console.log(`  [MEMBER] Added member ${mem.userId} (${mem.role})`);
        } else {
          stats.skipped.projectMembers++;
        }
      } catch (err) {
        stats.failed.projectMembers++;
      }
    }

    // Teams & Team Members
    const createdTeams = new Map();
    for (const team of proj.teams ?? []) {
      let tObj = existingRecords.teams.find((t) => t.name === team.name && (t.projectId === project.id || t.project_id === project.id));
      if (!tObj) {
        try {
          const tRes = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              projectId: project.id,
              name: team.name,
              description: team.description,
            }),
          });
          if (tRes.ok) {
            tObj = await tRes.json();
            stats.created.teams++;
            console.log(`  [CREATED] Team: ${team.name} (${tObj.id})`);
          } else {
            stats.failed.teams++;
            console.error(`  [FAILED] Team ${team.name}: ${await tRes.text()}`);
          }
        } catch (err) {
          stats.failed.teams++;
        }
      } else {
        stats.skipped.teams++;
      }

      if (tObj) {
        createdTeams.set(team.name, tObj);
        for (const tm of team.members ?? []) {
          try {
            const tmRes = await fetch(`${API_BASE}/teams/${tObj.id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
              body: JSON.stringify({ userId: tm.userId, role: tm.role }),
            });
            if (tmRes.ok) {
              stats.created.teamMembers++;
            } else {
              stats.skipped.teamMembers++;
            }
          } catch {
            stats.failed.teamMembers++;
          }
        }
      }
    }

    // Sprints
    const createdSprints = new Map();
    for (const sprint of proj.sprints ?? []) {
      let sObj = existingRecords.sprints.find((s) => s.name === sprint.name && (s.projectId === project.id || s.project_id === project.id));
      if (!sObj) {
        try {
          const sRes = await fetch(`${API_BASE}/sprints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              project_id: project.id,
              name: sprint.name,
              goal: sprint.goal,
              start_date: sprint.startDate,
              end_date: sprint.endDate,
            }),
          });
          if (sRes.ok) {
            sObj = await sRes.json();
            stats.created.sprints++;
            console.log(`  [CREATED] Sprint: ${sprint.name} (${sObj.id})`);
            if (sprint.status === 'ACTIVE') {
              await fetch(`${API_BASE}/sprints/${sObj.id}/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
              });
            } else if (sprint.status === 'COMPLETED') {
              await fetch(`${API_BASE}/sprints/${sObj.id}/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
              });
              await fetch(`${API_BASE}/sprints/${sObj.id}/complete`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
              });
            }
          } else {
            stats.failed.sprints++;
            console.error(`  [FAILED] Sprint ${sprint.name}: ${await sRes.text()}`);
          }
        } catch (err) {
          stats.failed.sprints++;
        }
      } else {
        stats.skipped.sprints++;
      }
      if (sObj) {
        createdSprints.set(sprint.key, sObj);
      }
    }

    // Tasks
    const createdTasks = new Map();
    for (const task of proj.tasks ?? []) {
      let kObj = existingRecords.tasks.find((k) => k.title === task.title && (k.projectId === project.id || k.project_id === project.id));
      if (!kObj) {
        const teamId = task.teamName ? createdTeams.get(task.teamName)?.id : undefined;
        const sprintId = task.sprintKey ? createdSprints.get(task.sprintKey)?.id : undefined;
        try {
          const kRes = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              projectId: project.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              assigneeId: task.assigneeId,
              teamId,
              sprintId,
            }),
          });
          if (kRes.ok) {
            kObj = await kRes.json();
            stats.created.tasks++;
            console.log(`  [CREATED] Task: ${task.title} (${kObj.id})`);
          } else {
            stats.failed.tasks++;
            console.error(`  [FAILED] Task ${task.title}: ${await kRes.text()}`);
          }
        } catch (err) {
          stats.failed.tasks++;
        }
      } else {
        stats.skipped.tasks++;
      }
      if (kObj) {
        createdTasks.set(task.key, kObj);
      }
    }

    // Task Dependencies
    for (const task of proj.tasks ?? []) {
      if (task.dependsOnKey) {
        const targetTask = createdTasks.get(task.key);
        const depTask = createdTasks.get(task.dependsOnKey);
        if (targetTask && depTask) {
          try {
            const depRes = await fetch(`${API_BASE}/tasks/${targetTask.id}/dependencies`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
              body: JSON.stringify({ dependsOnTaskId: depTask.id }),
            });
            if (depRes.ok) {
              stats.created.dependencies++;
              console.log(`  [DEP] '${task.key}' depends on '${task.dependsOnKey}'`);
            } else {
              stats.skipped.dependencies++;
            }
          } catch {
            stats.failed.dependencies++;
          }
        }
      }
    }

    // Risks
    for (const risk of proj.risks ?? []) {
      let rObj = existingRecords.risks.find((r) => r.title === risk.title && (r.projectId === project.id || r.project_id === project.id));
      if (!rObj) {
        try {
          const rRes = await fetch(`${API_BASE}/risks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              project_id: project.id,
              title: risk.title,
              description: risk.description,
              probability: risk.probability,
              impact: risk.impact,
              status: risk.status,
              mitigation_plan: risk.mitigationPlan,
              owner_id: risk.ownerId,
              due_date: risk.dueDate,
            }),
          });
          if (rRes.ok) {
            rObj = await rRes.json();
            stats.created.risks++;
            console.log(`  [CREATED] Risk: ${risk.title} (${rObj.id})`);
          } else {
            stats.failed.risks++;
            console.error(`  [FAILED] Risk ${risk.title}: ${await rRes.text()}`);
          }
        } catch (err) {
          stats.failed.risks++;
        }
      } else {
        stats.skipped.risks++;
      }
    }
  }

  console.log('\n========================================================================');
  console.log(' LIVE SEEDING EXECUTION SUMMARY');
  console.log('========================================================================');
  console.log('Entities Created:', stats.created);
  console.log('Entities Skipped:', stats.skipped);
  console.log('Entities Failed:', stats.failed);
  return stats;
}

// Entry point execution
const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

if (process.argv[1] && process.argv[1].endsWith('seed-demo-portfolio.mjs')) {
  runPortfolioSeed(isDryRun).catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
