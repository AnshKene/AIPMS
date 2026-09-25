# AIPMS Team Service

The **AIPMS Team Service** is an independent microservice responsible for team management and project membership tracking in the AIPMS (AI-Based Project Management System) platform.

---

## Service Purpose & Responsibilities

- **Team Management**: Create, list, retrieve, update, and delete teams tied to projects (`/api/teams`).
- **Team Membership**: Add members, list team members, update member roles, and remove members from teams (`/api/teams/:teamId/members`).
- **Role Control**: Assign team roles (`TEAM_LEAD`, `MEMBER`).
- **Health Monitoring**: Independent service health check (`GET /api/health`).

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
PORT=3003
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3003
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Security Note**: Never commit real Supabase credentials. `.env` is ignored by Git.

---

## Database Schema

SQL schema definition is stored in `database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('TEAM_LEAD', 'MEMBER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

---

## Installation & Setup

```bash
# Navigate to team-service directory
cd services/team-service

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

### Health Endpoint
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check endpoint |

### Team Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/teams` | Create a new team |
| GET | `/api/teams` | List teams (supports `?page=1&limit=20&projectId=<uuid>`) |
| GET | `/api/teams/:id` | Get team details by UUID |
| PATCH | `/api/teams/:id` | Update team details |
| DELETE | `/api/teams/:id` | Delete team (cascades to team members) |

### Team Member Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/teams/:teamId/members` | Add a member to a team (prevents duplicate `team_id` + `user_id`) |
| GET | `/api/teams/:teamId/members` | List members of a team (supports `?page=1&limit=20`) |
| PATCH | `/api/teams/:teamId/members/:memberId` | Update member role (`TEAM_LEAD` / `MEMBER`) |
| DELETE | `/api/teams/:teamId/members/:memberId` | Remove member from a team |

Interactive Swagger documentation is available at `http://localhost:3003/api/docs` when running locally.
