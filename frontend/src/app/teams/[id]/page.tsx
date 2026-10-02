'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { TeamDetail } from '@/components/teams/team-detail';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  if (!teamId) {
    return (
      <AppShell>
        <div className="p-6 text-sm text-slate-500">Invalid team ID.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-2">
        <TeamDetail
          teamId={teamId}
          onBack={() => router.push('/teams')}
          onTeamDeleted={() => router.push('/teams')}
          isStandalonePage
        />
      </div>
    </AppShell>
  );
}
