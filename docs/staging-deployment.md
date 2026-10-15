# AIPMS Staging Deployment Guide

This guide details the procedure for deploying the AIPMS (AI-Based Project Management System) microservices and frontend application to a staging environment using Render, Vercel, and managed Supabase.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Vercel (Staging)              │
                      │     Next.js Frontend (port 3008)       │
                      │  https://aipms-staging.vercel.app      │
                      └──────────────────┬─────────────────────┘
                                         │ HTTPS API Requests
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          Render (Staging)              │
                      │        API Gateway (Public)            │
                      │  https://aipms-gateway.onrender.com    │
                      └──────────────────┬─────────────────────┘
                                         │ Internal Network
                 ┌───────────────────────┼────────────────────────┐
                 ▼                       ▼                        ▼
        ┌─────────────────┐     ┌─────────────────┐      ┌─────────────────┐
        │  auth-service   │     │ project-service │      │   ai-service    │
        │ (Private pserv) │     │ (Private pserv) │      │ (Private pserv) │
        └────────┬────────┘     └────────┬────────┘      └────────┬────────┘
                 │                       │                        │
                 └───────────────────────┼────────────────────────┘
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       Managed Supabase (PostgreSQL)    │
                      │  Row-Level Security (RLS) & Auth       │
                      └────────────────────────────────────────┘
```

---

## 1. Prerequisites & Environment Configuration

### A. Managed Supabase
1. Run the database migration scripts in order:
   - `supabase/migrations/` (tables, RLS policies, indexes, and triggers)
   - Ensure tables `projects`, `teams`, `tasks`, `sprints`, `risks` have RLS enabled.
2. Note the connection details from Supabase Dashboard:
   - `SUPABASE_URL`: e.g. `https://your-ref.supabase.co`
   - `SUPABASE_ANON_KEY`: Safe for frontend client and gateway verification.
   - `SUPABASE_SERVICE_ROLE_KEY`: Kept private on backend microservices for administrative operations.

### B. Ollama / AI Service Staging Considerations
- In local development, `ai-service` connects to Ollama on `host.docker.internal:11434` or `localhost:11434`.
- For staging:
  - If a dedicated GPU instance is available: Set `OLLAMA_BASE_URL=https://ollama-staging.yourdomain.com`.
  - If Ollama is not provisioned: The `ai-service` includes an automated graceful fallback (`HeuristicAnalysisEngine`) that provides deterministic health calculations, risk mitigations, delivery projections, and workload balancing without downtime.

---

## 2. Deploying Backend Microservices to Render

1. **Connect Repository**: Link the GitHub repository to your Render team workspace.
2. **Apply Blueprint**: In Render dashboard, select **New > Blueprint** and select `render.yaml` from repository root.
3. **Configure Environment Variables** (marked `sync: false` in `render.yaml`):
   - In `aipms-api-gateway`:
     - `SUPABASE_URL`: `https://your-ref.supabase.co`
     - `SUPABASE_ANON_KEY`: `<anon-key>`
     - `CORS_ORIGIN`: `https://aipms-staging.vercel.app`
   - In all microservices (`auth`, `project`, `team`, `task`, `sprint`, `risk`, `reporting`, `ai`):
     - `SUPABASE_URL`: `https://your-ref.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY`: `<service-role-key>`
     - `SUPABASE_ANON_KEY`: `<anon-key>`
4. **Deploy**: Render builds each multi-stage Alpine Docker image and connects private services via Render internal DNS.

---

## 3. Deploying Frontend to Vercel

1. **Import Project**: In Vercel, import the `frontend` subfolder of the repository as the root directory:
   - Root Directory: `frontend`
   - Framework Preset: `Next.js`
2. **Configure Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://aipms-gateway.onrender.com/api`
   - `INTERNAL_API_URL`: `https://aipms-gateway.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://your-ref.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<anon-key>`
3. **Verify Deployment**:
   - Vercel automatically runs `next build` using Node 22.
   - Verify that all static and dynamic routes compile cleanly.

---

## 4. Staging Verification Checklist

- [ ] **API Gateway Health**: `GET https://aipms-gateway.onrender.com/api/health` returns status `ok`.
- [ ] **Private Services**: Confirm that private services are inaccessible from the public internet and respond to the API Gateway.
- [ ] **CORS Verification**: Requests from the Vercel staging origin succeed with proper CORS headers.
- [ ] **Frontend Login**: Supabase authentication flow logs the user in and receives a valid JWT session.
- [ ] **Data Isolation (RLS)**: Users can only query and mutate projects, teams, tasks, and sprints they own or belong to.
- [ ] **AI Endpoint**: Executive brief and project health endpoints respond accurately using evidence synthesis.
