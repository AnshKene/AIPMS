/**
 * AIPMS — Distribute Projects, Teams, Memberships & Tasks across all 18 Authentic Users
 *
 * Usage:
 *   node scripts/distribute-team-demo-data.mjs            (Dry-run preview)
 *   node scripts/distribute-team-demo-data.mjs --apply   (Apply updates to Supabase)
 */

import { createClient } from '../services/project-service/node_modules/@supabase/supabase-js/dist/index.cjs';
import fs from 'fs';
import path from 'path';

const isApply = process.argv.includes('--apply');

// Load environment variables from services/auth-service/.env
const envPath = path.resolve(process.cwd(), 'services/auth-service/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n').map((l) => l.trim()).filter(Boolean);

const supabaseUrl = envLines.find((l) => l.startsWith('SUPABASE_URL'))?.split('=')[1]?.trim();
const supabaseKey = envLines.find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY'))?.split('=')[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in services/auth-service/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All 18 Authentic Users mapped by Role
const USERS = {
  ADMIN: { id: '66544acc-4e3d-4b3b-b3f3-44971c6a9347', email: 'admin.ansh@aipms.com', name: 'Ansh' },
  // Project Owners
  OWNER_VYAS: { id: '86a1b0c5-6785-46ad-8397-18c106c01402', email: 'vyas@aipms.com', name: 'Vyas Thakre' },
  OWNER_CHETAN: { id: '24838f96-b931-4672-8127-a78bf22d76b0', email: 'chetan@aipms.com', name: 'Chetan Chopade' },
  // Project Managers
  PM_ARYAN: { id: '351723e1-0e4d-41e8-ad4e-3b6363711359', email: 'aryan@aipms.com', name: 'Aryan Radke' },
  PM_PRASUN: { id: 'ae0c709a-b59e-454d-9043-cf809a16ed11', email: 'prasun@aipms.com', name: 'Prasun Shamkule' },
  PM_SOMESH: { id: '2ae1a212-c1ca-475f-a356-f242d035d91c', email: 'somesh@aipms.com', name: 'Somesh Ninawe' },
  // Viewers / Stakeholders
  VIEWER_SONALI: { id: 'b1b7da8e-2564-487f-b4d5-03f90c71dedf', email: 'sonali@aipms.com', name: 'Sonali' },
  VIEWER_POOJA: { id: '86b21648-7e48-4e6d-8f72-ec5990985b3a', email: 'pooja@aipms.com', name: 'Pooja' },
  // Developers / Engineers
  DEV_AKASH: { id: 'd82cc5d0-55e2-4717-9853-597d69649c05', email: 'akash@aipms.com', name: 'Akash' },
  DEV_SARAH: { id: '4bea0362-f018-4d21-9a6a-e741dd89e39d', email: 'sarah@aipms.com', name: 'Sarah' },
  DEV_DEEPAK: { id: '3c95700b-b1c0-459f-a992-4dd43eed004a', email: 'deepak@aipms.com', name: 'Deepak' },
  DEV_HIMANSHU: { id: 'b3603dea-3a33-40da-842d-a99593a1828e', email: 'himanshu@aipms.com', name: 'Himanshu' },
  DEV_YASH: { id: 'b31a11fa-f5a5-4a82-932e-9d4c8f444991', email: 'yash@aipms.com', name: 'Yash' },
  DEV_SAHIL: { id: '827ac846-3428-4abc-8ad7-be67d466ffdf', email: 'sahil@aipms.com', name: 'Sahil' },
  DEV_RAHUL: { id: '961fe53d-4869-4a61-8f97-dfaaeda61a7a', email: 'rahul@aipms.com', name: 'Rahul' },
  DEV_LUCKY: { id: '5626ab0d-1866-4209-ac06-023453aa27ea', email: 'lucky@aipms.com', name: 'Lucky' },
  DEV_VEDANT: { id: 'bf43557f-e0c9-407f-a34c-50fec868c265', email: 'vedant@aipms.com', name: 'Vedant' },
  DEV_ARJUN: { id: '9691210f-1ddc-49b9-9130-21e9bc174a27', email: 'arjun@aipms.com', name: 'Arjun' },
};

const DEVELOPERS = [
  USERS.DEV_AKASH,
  USERS.DEV_SARAH,
  USERS.DEV_DEEPAK,
  USERS.DEV_HIMANSHU,
  USERS.DEV_YASH,
  USERS.DEV_SAHIL,
  USERS.DEV_RAHUL,
  USERS.DEV_LUCKY,
  USERS.DEV_VEDANT,
  USERS.DEV_ARJUN,
];

// Target Project Architecture
const PROJECT_CONFIGS = [
  {
    name: 'Customer CRM Portal',
    owner: USERS.OWNER_VYAS,
    pm: USERS.PM_ARYAN,
    viewer: USERS.VIEWER_POOJA,
    engineers: [USERS.DEV_SARAH, USERS.DEV_DEEPAK, USERS.DEV_ARJUN, USERS.DEV_LUCKY],
    teams: [
      {
        name: 'Frontend Engineering',
        lead: USERS.DEV_SARAH,
        members: [USERS.DEV_ARJUN],
      },
      {
        name: 'Backend & Integrations',
        lead: USERS.DEV_DEEPAK,
        members: [USERS.DEV_LUCKY],
      },
    ],
  },
  {
    name: 'AIPMS Platform Development',
    owner: USERS.OWNER_VYAS,
    pm: USERS.PM_ARYAN,
    viewer: USERS.VIEWER_SONALI,
    engineers: [USERS.DEV_AKASH, USERS.DEV_HIMANSHU, USERS.DEV_VEDANT, USERS.DEV_SAHIL],
    teams: [
      {
        name: 'AI Intelligence & Copilot Engine',
        lead: USERS.DEV_AKASH,
        members: [USERS.DEV_VEDANT],
      },
      {
        name: 'Microservices & Infrastructure',
        lead: USERS.DEV_HIMANSHU,
        members: [USERS.DEV_SAHIL],
      },
    ],
  },
  {
    name: 'E-Commerce Modernization',
    owner: USERS.OWNER_VYAS,
    pm: USERS.PM_PRASUN,
    viewer: USERS.VIEWER_SONALI,
    engineers: [USERS.DEV_YASH, USERS.DEV_RAHUL, USERS.DEV_AKASH, USERS.DEV_SARAH],
    teams: [
      {
        name: 'Storefront Experience',
        lead: USERS.DEV_YASH,
        members: [USERS.DEV_RAHUL],
      },
      {
        name: 'Checkout & Payment Security',
        lead: USERS.DEV_AKASH,
        members: [USERS.DEV_SARAH],
      },
    ],
  },
  {
    name: 'Healthcare Appointment System',
    owner: USERS.OWNER_CHETAN,
    pm: USERS.PM_PRASUN,
    viewer: USERS.VIEWER_POOJA,
    engineers: [USERS.DEV_LUCKY, USERS.DEV_HIMANSHU, USERS.DEV_DEEPAK, USERS.DEV_VEDANT],
    teams: [
      {
        name: 'Patient Portal & Telehealth',
        lead: USERS.DEV_LUCKY,
        members: [USERS.DEV_HIMANSHU],
      },
      {
        name: 'HIPAA & Compliance Security',
        lead: USERS.DEV_DEEPAK,
        members: [USERS.DEV_VEDANT],
      },
    ],
  },
  {
    name: 'Smart Agriculture Dashboard',
    owner: USERS.OWNER_CHETAN,
    pm: USERS.PM_SOMESH,
    viewer: USERS.VIEWER_SONALI,
    engineers: [USERS.DEV_SAHIL, USERS.DEV_ARJUN, USERS.DEV_RAHUL, USERS.DEV_YASH],
    teams: [
      {
        name: 'IoT Sensor Telemetry',
        lead: USERS.DEV_SAHIL,
        members: [USERS.DEV_ARJUN],
      },
      {
        name: 'Analytics & Heatmap Visuals',
        lead: USERS.DEV_RAHUL,
        members: [USERS.DEV_YASH],
      },
    ],
  },
];

async function main() {
  console.log(`=== AIPMS Realistic Team & Project Distribution (${isApply ? 'LIVE APPLY' : 'DRY-RUN'}) ===\n`);

  // 1. Fetch current projects
  const { data: existingProjects, error: pErr } = await supabase.from('projects').select('*');
  if (pErr) throw pErr;

  console.log(`Found ${existingProjects.length} existing projects.`);

  for (const cfg of PROJECT_CONFIGS) {
    const proj = existingProjects.find((p) => p.name.trim() === cfg.name.trim());
    if (!proj) {
      console.warn(`[WARN] Project "${cfg.name}" not found in database! Skipping.`);
      continue;
    }

    console.log(`\n---------------------------------------------------------`);
    console.log(`Project: "${proj.name}" (ID: ${proj.id})`);
    console.log(`  Target Owner: ${cfg.owner.name} (${cfg.owner.email})`);
    console.log(`  Target PM:    ${cfg.pm.name} (${cfg.pm.email})`);
    console.log(`  Viewer:       ${cfg.viewer.name} (${cfg.viewer.email})`);
    console.log(`  Engineers:    ${cfg.engineers.map((e) => e.name).join(', ')}`);

    if (isApply) {
      // 1. Update Project Owner
      if (proj.owner_id !== cfg.owner.id) {
        const { error: oErr } = await supabase
          .from('projects')
          .update({ owner_id: cfg.owner.id })
          .eq('id', proj.id);
        if (oErr) console.error(`    [FAIL] Project owner update: ${oErr.message}`);
        else console.log(`    [OK] Project owner updated to ${cfg.owner.name}`);
      }

      // 2. Sync Project Members
      await supabase.from('project_members').delete().eq('project_id', proj.id);

      const targetMembers = [
        { project_id: proj.id, user_id: cfg.pm.id, role: 'PROJECT_MANAGER' },
        { project_id: proj.id, user_id: cfg.viewer.id, role: 'VIEWER' },
        ...cfg.engineers.map((e) => ({ project_id: proj.id, user_id: e.id, role: 'MEMBER' })),
      ];

      const { error: pmErr } = await supabase.from('project_members').insert(targetMembers);
      if (pmErr) console.error(`    [FAIL] Project members insert: ${pmErr.message}`);
      else console.log(`    [OK] Inserted ${targetMembers.length} project memberships`);

      // 3. Sync Teams and Team Members
      const { data: existingTeams } = await supabase.from('teams').select('*').eq('project_id', proj.id);

      for (const tCfg of cfg.teams) {
        let team = existingTeams?.find((t) => t.name.trim() === tCfg.name.trim());
        if (!team) {
          const { data: newTeam, error: ntErr } = await supabase
            .from('teams')
            .insert({
              project_id: proj.id,
              name: tCfg.name,
              description: `${tCfg.name} for ${proj.name}`,
            })
            .select()
            .single();
          if (ntErr) {
            console.error(`    [FAIL] Create team "${tCfg.name}": ${ntErr.message}`);
            continue;
          }
          team = newTeam;
          console.log(`    [OK] Created team "${team.name}"`);
        }

        await supabase.from('team_members').delete().eq('team_id', team.id);

        const targetTeamMembers = [
          { team_id: team.id, user_id: tCfg.lead.id, role: 'TEAM_LEAD' },
          ...tCfg.members.map((m) => ({ team_id: team.id, user_id: m.id, role: 'MEMBER' })),
        ];

        const { error: tmErr } = await supabase.from('team_members').insert(targetTeamMembers);
        if (tmErr) console.error(`    [FAIL] Team members for "${team.name}": ${tmErr.message}`);
        else console.log(`    [OK] Team "${team.name}": Lead ${tCfg.lead.name}, Members: ${tCfg.members.map((m) => m.name).join(', ')}`);
      }

      // 4. Distribute Tasks evenly across the project's teams, and strictly to team members
      const { data: updatedTeams } = await supabase.from('teams').select('*').eq('project_id', proj.id);
      const teamList = [];
      for (const tCfg of cfg.teams) {
        const teamObj = updatedTeams?.find((t) => t.name.trim() === tCfg.name.trim());
        if (teamObj) {
          teamList.push({
            id: teamObj.id,
            name: teamObj.name,
            members: [tCfg.lead, ...tCfg.members],
          });
        }
      }

      const { data: projTasks } = await supabase.from('tasks').select('id, title, status').eq('project_id', proj.id);
      if (projTasks && projTasks.length > 0 && teamList.length > 0) {
        console.log(`    Distributing ${projTasks.length} tasks across ${teamList.length} teams and their members...`);

        const memberIndexByTeam = new Map();
        teamList.forEach((t) => memberIndexByTeam.set(t.id, 0));

        for (let i = 0; i < projTasks.length; i++) {
          const task = projTasks[i];
          const targetTeam = teamList[i % teamList.length];
          const mIdx = memberIndexByTeam.get(targetTeam.id) || 0;
          const assignee = targetTeam.members[mIdx % targetTeam.members.length];
          memberIndexByTeam.set(targetTeam.id, mIdx + 1);

          const { error: tUpErr } = await supabase
            .from('tasks')
            .update({
              team_id: targetTeam.id,
              assignee_id: assignee.id,
            })
            .eq('id', task.id);

          if (tUpErr) {
            console.error(`      [FAIL] Task "${task.title}": ${tUpErr.message}`);
          }
        }
        console.log(`    [OK] Distributed ${projTasks.length} tasks evenly across ${teamList.map((t) => t.name).join(' & ')}.`);
      }
    } else {
      console.log(`  [PLAN] Would set owner to ${cfg.owner.name} (${cfg.owner.email})`);
      console.log(`  [PLAN] Would set PM to ${cfg.pm.name} (${cfg.pm.email})`);
      console.log(`  [PLAN] Would add ${cfg.engineers.length} developers as project members`);
      console.log(`  [PLAN] Would configure teams: ${cfg.teams.map((t) => `${t.name} (Lead: ${t.lead.name})`).join(', ')}`);
    }
  }

  // 5. Global Summary Check
  if (isApply) {
    console.log(`\n=========================================================`);
    console.log(`=== POST-APPLY VERIFICATION SUMMARY ===`);
    const { data: updatedProjects } = await supabase.from('projects').select('name, owner_id');
    console.log(`\nProjects & Owners:`);
    updatedProjects?.forEach((p) => {
      const owner = Object.values(USERS).find((u) => u.id === p.owner_id);
      console.log(`  • ${p.name}: ${owner ? `${owner.name} (${owner.email})` : p.owner_id}`);
    });

    const { data: allMembers } = await supabase.from('project_members').select('role, user_id');
    console.log(`\nTotal Project Memberships: ${allMembers?.length}`);

    const { data: allTasks } = await supabase.from('tasks').select('assignee_id');
    const taskAssigneeCount = new Map();
    allTasks?.forEach((t) => {
      if (t.assignee_id) {
        taskAssigneeCount.set(t.assignee_id, (taskAssigneeCount.get(t.assignee_id) || 0) + 1);
      }
    });

    console.log(`\nTask Assignments by Developer:`);
    DEVELOPERS.forEach((dev) => {
      const count = taskAssigneeCount.get(dev.id) || 0;
      console.log(`  • ${dev.name} (${dev.email}): ${count} tasks`);
    });
  }

  console.log(`\nScript finished.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
