'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { TeamDetail } from '@/components/teams/team-detail';
import { NotFoundState } from '@/components/ui/error-state';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  if (!teamId) {
    return (
      <AppShell>
        <div className="py-12">
          <NotFoundState
            title="Invalid Team Identifier"
            description="The requested team identifier is invalid or missing."
            backLink="/teams"
            backLinkLabel="Return to Teams Workspace"
          />
        </div>
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
