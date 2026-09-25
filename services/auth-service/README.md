# AIPMS Authentication Service

The **AIPMS Auth Service** is an independent microservice responsible for user authentication, session management, user identity retrieval, and authentication token validation across the AIPMS (AI-Based Project Management System) platform using Supabase Authentication.

---

## Service Purpose & Responsibilities

- **User Registration**: Register new users using Supabase Auth (`POST /api/auth/register`).
- **User Login**: Authenticate users via Supabase credentials and return access/refresh tokens (`POST /api/auth/login`).
- **User Profile Retrieval**: Retrieve current authenticated user details using validated Supabase access tokens (`GET /api/auth/me`).
- **User Logout**: Terminate active session via Supabase (`POST /api/auth/logout`).
- **Health Monitoring**: Service health status check (`GET /api/health`).

---

## Tech Stack

- **Framework**: NestJS (v12 runtime, `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`)
- **Language**: TypeScript (ESM, `nodenext` module resolution)
- **Auth Provider**: Supabase Auth (`@supabase/supabase-js`)
- **Validation**: `class-validator`, `class-transformer`
- **Testing**: Vitest, Supertest
- **Documentation**: Swagger / OpenAPI (`/api/docs`)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project parameters:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Security Note**: Never commit real Supabase credentials or service-role keys to source control. `.env` is ignored by Git.

---

## Installation & Setup

```bash
# Navigate to auth-service directory
cd services/auth-service

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

| Method | Endpoint | Purpose | Auth Required |
|---|---|---|---|
| GET | `/api/health` | Health check endpoint | No |
| POST | `/api/auth/register` | User registration | No |
| POST | `/api/auth/login` | User login / session creation | No |
| GET | `/api/auth/me` | Current authenticated user profile | Yes (`Bearer <token>`) |
| POST | `/api/auth/logout` | User session termination | Yes (`Bearer <token>`) |

Interactive Swagger documentation is available at `http://localhost:3001/api/docs` when running locally.

---

## Supabase Integration Overview

The Auth Service integrates with Supabase Auth via the official `@supabase/supabase-js` client using standard client-side anonymous keys (`SUPABASE_ANON_KEY`).

- **Password Storage**: Handled entirely by Supabase Auth; no passwords are saved in AIPMS application databases.
- **Token Validation**: `/api/auth/me` validates incoming Bearer access tokens directly against Supabase (`supabase.auth.getUser(token)`).
- **Stateless Operation**: No local session database or custom JWT generation is required. Supabase acts as the authoritative authentication provider.
