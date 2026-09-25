# AIPMS Project Service

The **AIPMS Project Service** is an independent microservice responsible for project data management, schema definitions, and project lifecycle operations (creation, retrieval, update, and archiving) in the AIPMS (AI-Based Project Management System) platform.

---

## Service Purpose & Responsibilities

- **Project Creation**: Create projects with validation for status, dates, and owner ID (`POST /api/projects`).
- **Project Listing**: Paginated retrieval of projects with optional status and owner filtering (`GET /api/projects`).
- **Project Retrieval**: Fetch a specific project by UUID (`GET /api/projects/:id`).
- **Project Update**: Modify project metadata, dates, or status (`PATCH /api/projects/:id`).
- **Project Archiving**: Soft-delete/archive project records by setting status to `ARCHIVED` (`DELETE /api/projects/:id`).
- **Health Check**: Microservice health monitoring (`GET /api/health`).

---

## Tech Stack

- **Framework**: NestJS (v12 runtime, `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`)
- **Language**: TypeScript (ESM, `nodenext` module resolution)
- **Database**: Supabase PostgreSQL (`@supabase/supabase-js`)
- **Validation**: `class-validator`, `class-transformer`
- **Testing**: Vitest, Supertest
- **Documentation**: Swagger / OpenAPI (`/api/docs`)

---

## Environment Variables

Copy `.env.example` to `.env` and configure your Supabase parameters:

```env
PORT=3002
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Security Note**: Never commit real Supabase credentials. `.env` is ignored by Git.

---

## Database Schema

SQL schema definition is stored in `database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Installation & Setup

```bash
# Navigate to project-service directory
cd services/project-service

# Install dependencies
npm install
```

---

## Development Commands

```bash
# Start development server with watch mode
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

---

## Testing Commands

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run test coverage
npm run test:cov
```

---

## Available Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check endpoint |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects` | List projects (supports `?page=1&limit=20&status=PLANNING&ownerId=<uuid>`) |
| GET | `/api/projects/:id` | Get project by UUID |
| PATCH | `/api/projects/:id` | Update project by UUID |
| DELETE | `/api/projects/:id` | Archive project (sets status to `ARCHIVED`) |

Interactive Swagger documentation is available at `http://localhost:3002/api/docs` when running locally.
