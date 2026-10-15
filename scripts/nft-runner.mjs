import http from 'http';

const GATEWAY_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3008';

// Helper for HTTP requests with timing
async function timedFetch(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(options.timeout || 10000),
    });
    const duration = performance.now() - start;
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      duration,
      body,
      rawLength: text.length,
      ok: res.ok,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      status: 0,
      headers: {},
      duration,
      error: err.message,
      body: null,
      rawLength: 0,
      ok: false,
    };
  }
}

// Statistical calculation helper
function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
  return {
    count: sorted.length,
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(avg),
    p50: Math.round(p50),
    p95: Math.round(p95),
    p99: Math.round(p99),
  };
}

async function runAudit() {
  console.log('=== AIPMS NON-FUNCTIONAL TESTING (NFT) AUDIT ENGINE ===');
  console.log('Timestamp:', new Date().toISOString());

  const results = {
    performance: {},
    scalability: {},
    security: {},
    reliability: {},
    aiQuality: {},
    dataIntegrity: {},
  };

  // 1. Authenticate & Obtain Tokens for RBAC testing
  console.log('\n[1] Preparing Authenticated Test Sessions...');
  const testEmail = `nft_admin_${Date.now()}@aipms.com`;
  const memberEmail = `nft_member_${Date.now()}@aipms.com`;

  // Register admin user
  const regAdmin = await timedFetch(`${GATEWAY_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'Password123!', name: 'NFT Admin' }),
  });
  console.log('Admin registration status:', regAdmin.status);

  // Register standard member user
  const regMember = await timedFetch(`${GATEWAY_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: memberEmail, password: 'Password123!', name: 'NFT Member' }),
  });
  console.log('Member registration status:', regMember.status);

  // Login admin
  const loginAdmin = await timedFetch(`${GATEWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
  });
  const adminToken = loginAdmin.body?.accessToken;

  // Login member
  const loginMember = await timedFetch(`${GATEWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: memberEmail, password: 'Password123!' }),
  });
  const memberToken = loginMember.body?.accessToken;

  console.log('Admin token acquired:', Boolean(adminToken));
  console.log('Member token acquired:', Boolean(memberToken));

  // 2. Fetch existing projects to get a valid project ID
  const projectsRes = await timedFetch(`${GATEWAY_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const projectList = Array.isArray(projectsRes.body?.data) ? projectsRes.body.data : [];
  const testProjectId = projectList[0]?.id || '11111111-1111-4111-a111-111111111111';
  console.log(`Found ${projectList.length} projects. Target project ID: ${testProjectId}`);

  // ========================================================
  // PHASE 1: PERFORMANCE & RESPONSE-TIME BENCHMARKS
  // ========================================================
  console.log('\n[2] Executing Phase 1: Latency & Throughput Benchmarks (N=20 iterations each)...');
  const endpointsToBenchmark = [
    { name: 'Gateway Health Check', url: `${GATEWAY_URL}/api/health`, method: 'GET', auth: false },
    { name: 'Projects List (Read)', url: `${GATEWAY_URL}/api/projects?page=1&limit=20`, method: 'GET', auth: true },
    { name: 'Teams List (Read)', url: `${GATEWAY_URL}/api/teams?page=1&limit=20`, method: 'GET', auth: true },
    { name: 'Tasks List (Read)', url: `${GATEWAY_URL}/api/tasks?page=1&limit=20`, method: 'GET', auth: true },
    { name: 'Sprints List (Read)', url: `${GATEWAY_URL}/api/sprints?page=1&limit=20`, method: 'GET', auth: true },
    { name: 'Risks List (Read)', url: `${GATEWAY_URL}/api/risks?page=1&limit=20`, method: 'GET', auth: true },
    { name: 'Reports Overview (Aggregate)', url: `${GATEWAY_URL}/api/reports/projects/${testProjectId}/overview`, method: 'GET', auth: true },
  ];

  for (const ep of endpointsToBenchmark) {
    const latencies = [];
    let successCount = 0;
    let failCount = 0;
    let lastSize = 0;

    for (let i = 0; i < 20; i++) {
      const headers = { 'Content-Type': 'application/json' };
      if (ep.auth && adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
      const res = await timedFetch(ep.url, { method: ep.method, headers });
      latencies.push(res.duration);
      if (res.ok) successCount++;
      else failCount++;
      lastSize = res.rawLength;
    }

    const stats = calculateStats(latencies);
    results.performance[ep.name] = {
      ...stats,
      successCount,
      failCount,
      payloadBytes: lastSize,
      targetMet: stats.p95 <= 500 ? 'PASS' : 'FAIL',
    };
    console.log(`  ${ep.name.padEnd(30)}: p50=${stats.p50}ms | p95=${stats.p95}ms | p99=${stats.p99}ms | Success=${successCount}/20 [${results.performance[ep.name].targetMet}]`);
  }

  // Benchmark AI Endpoint Latency separately
  console.log('\n[3] Benchmarking AI Service Latency...');
  const aiLatencies = [];
  for (let i = 0; i < 5; i++) {
    const res = await timedFetch(`${GATEWAY_URL}/api/ai/projects/${testProjectId}/health-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    aiLatencies.push(res.duration);
  }
  const aiStats = calculateStats(aiLatencies);
  results.performance['AI Project Health Summary'] = {
    ...aiStats,
    type: 'AI Inference / Deterministic Fallback',
  };
  console.log(`  AI Health Summary: p50=${aiStats.p50}ms | p95=${aiStats.p95}ms | min=${aiStats.min}ms | max=${aiStats.max}ms`);

  // ========================================================
  // PHASE 2: SCALABILITY & WORKLOAD BEHAVIOR
  // ========================================================
  console.log('\n[4] Executing Phase 2: Scalability, Pagination & Payload Growth...');
  const paginationTests = [
    { limit: 5, label: 'Small page (limit=5)' },
    { limit: 20, label: 'Standard page (limit=20)' },
    { limit: 50, label: 'Large page (limit=50)' },
    { limit: 100, label: 'Bulk page (limit=100)' },
  ];

  for (const pt of paginationTests) {
    const res = await timedFetch(`${GATEWAY_URL}/api/tasks?page=1&limit=${pt.limit}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    results.scalability[pt.label] = {
      status: res.status,
      durationMs: Math.round(res.duration),
      payloadBytes: res.rawLength,
      itemCount: res.body?.data?.length || 0,
      totalReported: res.body?.meta?.total || 0,
    };
    console.log(`  ${pt.label.padEnd(28)}: ${Math.round(res.duration)}ms | Size=${res.rawLength} bytes | Items=${res.body?.data?.length || 0}`);
  }

  // ========================================================
  // PHASE 3: SECURITY, RBAC & AUTHORIZATION
  // ========================================================
  console.log('\n[5] Executing Phase 3: Security & Authorization Audit...');

  // Test 3.1: Unauthenticated request to protected endpoints
  const unauthTest1 = await timedFetch(`${GATEWAY_URL}/api/projects`);
  const unauthTest2 = await timedFetch(`${GATEWAY_URL}/api/tasks`);
  const unauthTest3 = await timedFetch(`${GATEWAY_URL}/api/admin/overview`);
  results.security['Unauthenticated Rejection'] = {
    projectsStatus: unauthTest1.status,
    tasksStatus: unauthTest2.status,
    adminOverviewStatus: unauthTest3.status,
    pass: unauthTest1.status === 401 && unauthTest2.status === 401 && unauthTest3.status === 401,
  };
  console.log(`  Unauthenticated Protection: Projects=${unauthTest1.status}, Tasks=${unauthTest2.status}, AdminOverview=${unauthTest3.status} [${results.security['Unauthenticated Rejection'].pass ? 'PASS' : 'FAIL'}]`);

  // Test 3.2: Non-Admin attempting Admin functionality (RBAC)
  const nonAdminAudit = await timedFetch(`${GATEWAY_URL}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  results.security['RBAC Non-Admin Access to Audit Logs'] = {
    status: nonAdminAudit.status,
    blocked: nonAdminAudit.status === 403,
  };
  console.log(`  RBAC Non-Admin -> Audit Logs: HTTP ${nonAdminAudit.status} [${nonAdminAudit.status === 403 ? 'PASS' : 'FAIL'}]`);

  // Test 3.3: Self-promotion / unauthorized role change
  const roleTamper = await timedFetch(`${GATEWAY_URL}/api/auth/users/some-user-id/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ role: 'ADMIN' }),
  });
  results.security['Unauthorized Role Mutation'] = {
    status: roleTamper.status,
    blocked: roleTamper.status === 403,
  };
  console.log(`  RBAC Unauthorized Role Update: HTTP ${roleTamper.status} [${roleTamper.status === 403 ? 'PASS' : 'FAIL'}]`);

  // Test 3.4: CORS & Security Headers
  const optionsRes = await timedFetch(`${GATEWAY_URL}/api/health`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3008' },
  });
  const headersRes = await timedFetch(`${GATEWAY_URL}/api/health`);
  const secHeaders = {
    'x-content-type-options': headersRes.headers['x-content-type-options'] || 'MISSING',
    'x-frame-options': headersRes.headers['x-frame-options'] || 'MISSING',
    'strict-transport-security': headersRes.headers['strict-transport-security'] || 'MISSING (Local Dev)',
    'access-control-allow-origin': optionsRes.headers['access-control-allow-origin'] || 'MISSING',
  };
  results.security['Security Headers & CORS'] = secHeaders;
  console.log('  Security Headers:', secHeaders);

  // Test 3.5: SQL Injection & Malformed input handling
  const sqliTest = await timedFetch(`${GATEWAY_URL}/api/tasks?search=${encodeURIComponent("' OR '1'='1")}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  results.security['SQL Injection Resilience'] = {
    status: sqliTest.status,
    leakedData: Array.isArray(sqliTest.body?.data) && sqliTest.body.data.length > 100,
    safe: sqliTest.status === 200 || sqliTest.status === 400,
  };
  console.log(`  SQLi Defense Test: HTTP ${sqliTest.status} [${results.security['SQL Injection Resilience'].safe ? 'PASS' : 'FAIL'}]`);

  // ========================================================
  // PHASE 4: RELIABILITY & FAULT TOLERANCE
  // ========================================================
  console.log('\n[6] Executing Phase 4: Reliability & Fault Tolerance Audit...');

  // Test 4.1: Malformed JSON payload handling
  const malformedRes = await timedFetch(`${GATEWAY_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: '{"invalidJson": true, missingClose',
  });
  results.reliability['Malformed JSON Handling'] = {
    status: malformedRes.status,
    handledCleanly: malformedRes.status === 400,
  };
  console.log(`  Malformed JSON Input: HTTP ${malformedRes.status} (Expected 400) [${malformedRes.status === 400 ? 'PASS' : 'FAIL'}]`);

  // Test 4.2: Missing Required Fields Validation
  const missingFieldRes = await timedFetch(`${GATEWAY_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({}),
  });
  results.reliability['Validation Pipe Filtering'] = {
    status: missingFieldRes.status,
    validationTriggered: missingFieldRes.status === 400,
    errorsReturned: Boolean(missingFieldRes.body?.message),
  };
  console.log(`  Schema Validation Trigger: HTTP ${missingFieldRes.status} [${missingFieldRes.status === 400 ? 'PASS' : 'FAIL'}]`);

  // Test 4.3: Non-existent Resource Query (404 Handling)
  const notFoundRes = await timedFetch(`${GATEWAY_URL}/api/projects/a0000000-0000-4000-a000-000000000000`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  results.reliability['404 Not Found Handling'] = {
    status: notFoundRes.status,
    pass: notFoundRes.status === 404,
  };
  console.log(`  Non-Existent Resource Handling: HTTP ${notFoundRes.status} [${notFoundRes.status === 404 ? 'PASS' : 'FAIL'}]`);

  // ========================================================
  // PHASE 5: AI QUALITY & DETERMINISTIC FALLBACK
  // ========================================================
  console.log('\n[7] Executing Phase 5: AI Intelligence Quality & Output Schema Audit...');
  const aiHealthRes = await timedFetch(`${GATEWAY_URL}/api/ai/projects/${testProjectId}/health-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const aiData = aiHealthRes.body;
  const isAiSchemaValid =
    typeof aiData?.healthScore === 'number' &&
    typeof aiData?.trajectory === 'string' &&
    typeof aiData?.summary === 'string' &&
    Array.isArray(aiData?.recommendations);

  results.aiQuality['AI Health Summary Schema'] = {
    status: aiHealthRes.status,
    healthScore: aiData?.healthScore,
    trajectory: aiData?.trajectory,
    generatedBy: aiData?.generatedBy || 'unknown',
    hasRecommendations: Array.isArray(aiData?.recommendations),
    schemaValid: isAiSchemaValid,
  };
  console.log(`  AI Output Schema Validation: HealthScore=${aiData?.healthScore} | Model=${aiData?.generatedBy} [${isAiSchemaValid ? 'PASS' : 'FAIL'}]`);

  // ========================================================
  // PHASE 6: SUMMARY REPORT GENERATION
  // ========================================================
  console.log('\n=== AUDIT RESULTS SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runAudit().catch(console.error);
