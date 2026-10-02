'use client';

import * as React from 'react';
import { type Team, listTeamMembers, type TeamMember } from '@/lib/api/teams';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  ArrowRight,
  Pencil,
  Trash2,
  CalendarDays,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCardProps {
  team: Team;
  projectName?: string;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
  onSelect?: (team: Team) => void;
  className?: string;
}

export function TeamCard({
  team,
  projectName,
  onEdit,
  onDelete,
  onSelect,
  className,
}: TeamCardProps) {
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [memberCount, setMemberCount] = React.useState<number>(0);
  const [hasLead, setHasLead] = React.useState<boolean>(false);
  const [loadingMembers, setLoadingMembers] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    listTeamMembers(team.id, { limit: 5 })
      .then((res) => {
        if (!cancelled) {
          setMembers(res.data || []);
          setMemberCount(res.meta?.total ?? res.data?.length ?? 0);
          setHasLead((res.data || []).some((m) => m.role === 'TEAM_LEAD'));
        }
      })
      .catch(() => {
        // Silently handle card preview member fetch
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [team.id]);

  const teamInitial = team.name ? team.name.charAt(0).toUpperCase() : 'T';

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-blue-300 hover:shadow-md',
        className,
      )}
    >
      {/* Top Section */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 font-bold text-blue-700 text-sm">
              {teamInitial}
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3
                onClick={() => onSelect?.(team)}
                className="font-semibold text-sm text-slate-900 truncate hover:text-blue-600 transition-colors cursor-pointer"
                title={team.name}
              >
                {team.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {projectName || 'Associated Project'}
                </span>
              </div>
            </div>
          </div>

          {/* Lead badge if present */}
          {hasLead && (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0 gap-1 shrink-0 font-medium"
            >
              <Crown className="h-2.5 w-2.5 text-amber-500" />
              Lead Assigned
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] leading-relaxed">
          {team.description || (
            <span className="text-slate-400 italic">No description provided.</span>
          )}
        </p>
      </div>

      {/* Middle & Bottom Section */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        {/* Members Avatar Stack & Count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center">
            {loadingMembers ? (
              <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
            ) : members.length > 0 ? (
              <div className="flex items-center -space-x-2">
                {members.slice(0, 3).map((m) => (
                  <Avatar
                    key={m.id}
                    fallback={m.userId.slice(0, 2).toUpperCase()}
                    className={cn(
                      'h-6 w-6 text-[10px] ring-2 ring-white',
                      m.role === 'TEAM_LEAD'
                        ? 'bg-amber-100 text-amber-800 font-bold border-amber-300'
                        : 'bg-slate-200 text-slate-700',
                    )}
                    title={`Member: ${m.userId} (${m.role})`}
                  />
                ))}
                {memberCount > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white border border-slate-200">
                    +{memberCount - 3}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">0 members</span>
            )}

            {memberCount > 0 && (
              <span className="ml-2 text-xs font-medium text-slate-600">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <CalendarDays className="h-3 w-3" />
            {new Date(team.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(team)}
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                aria-label={`Edit ${team.name}`}
                title={`Edit ${team.name}`}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(team)}
                className="h-7 px-2 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                aria-label={`Delete ${team.name}`}
                title={`Delete ${team.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelect?.(team)}
            className="h-7 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 ml-auto group-hover:translate-x-0.5 transition-transform"
            aria-label={`Manage ${team.name}`}
          >
            <span>Manage</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
