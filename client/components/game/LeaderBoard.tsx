import { useTranslation } from 'next-i18next';
import { type MouseEvent, useEffect, useState } from 'react';
import { Player, LeaderBoardTable, UserData } from '@/lib/types';
import { ColorArr, WarringStates } from '@/lib/constants';
import useMediaQuery from '@/hooks/useMediaQuery';

interface LeaderBoardProps {
  players: Player[];
  leaderBoardTable: LeaderBoardTable | null;
  checkedPlayers?: UserData[];
  setCheckedPlayers?: (value: UserData[]) => void;
  warringStatesMode?: boolean;
}

type TeamSummary = {
  id: number;
  armyCount: number;
  landsCount: number;
  players: PlayerSummary[];
};

type PlayerSummary = {
  color: number;
  username: string | null;
  armyCount: number;
  landsCount: number;
  latencyMs: number | null;
  isBot: boolean;
};

export default function LeaderBoard(props: LeaderBoardProps) {
  const {
    players,
    leaderBoardTable,
    checkedPlayers,
    setCheckedPlayers,
    warringStatesMode = false,
  } = props;
  const isMobileDock = useMediaQuery('(max-width: 767px)');
  const [gameDockExpand, setGameDockExpand] = useState(() => !isMobileDock);
  const { t } = useTranslation();

  useEffect(() => {
    setGameDockExpand(!isMobileDock);
  }, [isMobileDock]);

  if (!leaderBoardTable) return null;

  const fetchPlayerByColor = (color: number) => {
    return players.find((player) => player.color === color) ?? null;
  };

  const getLatencyTone = (latencyMs: number | null, isBot: boolean) => {
    if (isBot) {
      return {
        backgroundColor: 'color-mix(in srgb, var(--bw-blue) 16%, transparent)',
        borderColor: 'color-mix(in srgb, var(--bw-blue) 44%, var(--bw-line))',
        color: 'var(--bw-blue)',
      };
    }

    if (latencyMs === null) {
      return {
        backgroundColor: 'color-mix(in srgb, var(--bw-muted-soft) 12%, transparent)',
        borderColor: 'var(--bw-line)',
        color: 'var(--bw-muted)',
      };
    }

    if (latencyMs <= 120) {
      return {
        backgroundColor: 'color-mix(in srgb, var(--bw-green) 18%, transparent)',
        borderColor: 'color-mix(in srgb, var(--bw-green) 48%, var(--bw-line))',
        color: 'var(--bw-green)',
      };
    }

    if (latencyMs <= 220) {
      return {
        backgroundColor: 'color-mix(in srgb, var(--bw-ember) 18%, transparent)',
        borderColor: 'color-mix(in srgb, var(--bw-ember) 48%, var(--bw-line))',
        color: 'var(--bw-ember)',
      };
    }

    return {
      backgroundColor: 'color-mix(in srgb, var(--bw-red) 18%, transparent)',
      borderColor: 'color-mix(in srgb, var(--bw-red) 48%, var(--bw-line))',
      color: 'var(--bw-red)',
    };
  };

  const renderLatencyBadge = (player: PlayerSummary) => {
    if (isCompact) {
      return null;
    }

    const tone = getLatencyTone(player.latencyMs, player.isBot);
    const badgeLabel = player.isBot
      ? t('bot')
      : player.latencyMs === null
        ? t('latency-unknown')
        : `${player.latencyMs}ms`;

    return (
      <span
        className='inline-flex min-h-6 shrink-0 items-center border px-1.5 py-px text-[10px] font-black uppercase tracking-[0.16em]'
        style={tone}
        title={`${t('latency')}: ${badgeLabel}`}
      >
        {badgeLabel}
      </span>
    );
  };

  const renderPlayerIdentity = (player: PlayerSummary, compact = false) => {
    if (compact) {
      return renderPlayerBadge(player, true);
    }

    return (
      <div className='flex min-w-0 items-center gap-2'>
        {renderPlayerBadge(player)}
        {renderLatencyBadge(player)}
      </div>
    );
  };

  const teamsMap = new Map<number, TeamSummary>();
  leaderBoardTable.forEach((row) => {
    const sourcePlayer = fetchPlayerByColor(row[0]);
    const existing = teamsMap.get(row[1]) ?? {
      id: row[1],
      armyCount: 0,
      landsCount: 0,
      players: [],
    };
    existing.armyCount += row[2];
    existing.landsCount += row[3];
    existing.players.push({
      color: row[0],
      username: sourcePlayer?.username ?? null,
      armyCount: row[2],
      landsCount: row[3],
      latencyMs: sourcePlayer?.latencyMs ?? null,
      isBot: sourcePlayer?.isBot ?? false,
    });
    teamsMap.set(row[1], existing);
  });

  const teams = Array.from(teamsMap.values())
    .sort((a, b) => b.armyCount - a.armyCount || b.landsCount - a.landsCount)
    .map((team) => ({
      ...team,
      players: team.players.sort(
        (a, b) => b.armyCount - a.armyCount || b.landsCount - a.landsCount
      ),
    }));
  const allTeamsHaveSinglePlayer =
    teams.length > 0 && teams.every((team) => team.players.length === 1);
  const isCompact = !gameDockExpand;
  const dockWidthClass = gameDockExpand
    ? isMobileDock
      ? 'min-w-[224px]'
      : 'min-w-[272px]'
    : isMobileDock
      ? 'min-w-[116px]'
      : 'min-w-[132px]';

  const renderPlayerBadge = (player: PlayerSummary, compact = false) => (
    <span
      className={`truncate border font-black ${
        compact ? 'max-w-[58px] px-1 py-px text-[10px] leading-none' : 'px-2 py-1'
      }`}
      style={{
        backgroundColor: ColorArr[player.color],
        borderColor: ColorArr[player.color],
        color: player.color === 0 ? '#09090b' : '#fff',
      }}
    >
      {player.username || `Player ${player.color}`}
    </span>
  );

  const toggleGameDockExpand = () => {
    setGameDockExpand((value) => !value);
  };

  const handleDockClick = (event: MouseEvent<HTMLElement>) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('button, input, a, select, textarea, label')
    ) {
      return;
    }

    toggleGameDockExpand();
  };

  const toggleTeamVisibility = (team: TeamSummary, checked: boolean) => {
    if (!checkedPlayers || !setCheckedPlayers) return;
    const teamId = String(team.id);
    if (checked) {
      const nextPlayers = [...checkedPlayers];
      team.players.forEach((player) => {
        if (!nextPlayers.some((item) => item.color === player.color)) {
          nextPlayers.push({
            team: teamId,
            username: player.username ?? '',
            color: player.color,
          });
        }
      });
      setCheckedPlayers(nextPlayers);
      return;
    }

    setCheckedPlayers(checkedPlayers.filter((player) => player.team !== teamId));
  };

  return (
    <section
      className={`bw-side-dock absolute right-0 top-0 z-[110] cursor-pointer overflow-hidden border-l border-b ${dockWidthClass}`}
      onClick={handleDockClick}
    >
      <button
        type='button'
        className={`flex w-full items-center justify-between border-b border-zinc-800 text-left ${
          isCompact ? 'px-2.5 py-1.5' : 'px-4 py-3'
        }`}
        onClick={(event) => {
          event.stopPropagation();
          toggleGameDockExpand();
        }}
      >
        <span className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500'>
          {gameDockExpand ? 'Leaderboard' : 'LB'}
        </span>
        <span className='text-xs font-black text-yellow-300'>
          {gameDockExpand ? '−' : '+'}
        </span>
      </button>

      <div className={`${isMobileDock ? 'max-h-[36vh]' : 'max-h-[45vh]'} overflow-auto`}>
        <div
          className={`grid grid-cols-[auto_1fr_auto_auto] border-b border-zinc-800 font-black uppercase text-zinc-500 ${
            isCompact
              ? 'gap-x-1.5 px-2 py-1 text-[9px] tracking-[0.12em]'
              : isMobileDock
                ? 'gap-x-2 px-3 py-2 text-[10px] tracking-[0.16em]'
                : 'gap-x-3 px-4 py-2 text-[10px] tracking-[0.18em]'
          }`}
        >
          {gameDockExpand && checkedPlayers && setCheckedPlayers ? <span>{t('view')}</span> : <span />}
          <span>{gameDockExpand ? t('player') : allTeamsHaveSinglePlayer ? 'P' : 'T'}</span>
          <span className='text-center'>{gameDockExpand ? t('army') : 'A'}</span>
          <span className='text-center'>{gameDockExpand ? t('land') : 'L'}</span>
        </div>

        {teams.map((team) => (
          <div key={team.id} className='border-b border-zinc-900/80'>
            <div
              className={`grid grid-cols-[auto_1fr_auto_auto] items-center bg-zinc-950/80 font-black text-zinc-100 ${
                isCompact
                  ? 'gap-x-1.5 px-2 py-1 text-xs leading-none'
                  : isMobileDock
                    ? 'gap-x-2 px-3 py-2 text-sm'
                    : 'gap-x-3 px-4 py-2 text-sm'
              }`}
            >
              {gameDockExpand && checkedPlayers && setCheckedPlayers ? (
                <input
                  type='checkbox'
                  className='size-4 accent-yellow-300'
                  checked={checkedPlayers.some(
                    (player) => player.team === String(team.id)
                  )}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => toggleTeamVisibility(team, event.target.checked)}
                />
              ) : (
                <span />
              )}
              {allTeamsHaveSinglePlayer && team.players[0] ? (
                renderPlayerIdentity(team.players[0], !gameDockExpand)
              ) : (
                <span>
                  {warringStatesMode ? WarringStates[team.players[0]?.color] + ' · ' : ''}
                  {gameDockExpand ? `TEAM ${team.id}` : `T${team.id}`}
                </span>
              )}
              <span className='text-center text-yellow-300'>{team.armyCount}</span>
              <span className='text-center text-zinc-300'>{team.landsCount}</span>
            </div>

            {gameDockExpand && !allTeamsHaveSinglePlayer &&
              team.players.map((player) => (
                <div
                  key={`${team.id}-${player.color}`}
                  className={`grid grid-cols-[auto_1fr_auto_auto] items-center text-sm ${
                    isMobileDock ? 'gap-x-2 px-3 py-2' : 'gap-x-3 px-4 py-2'
                  }`}
                >
                  {checkedPlayers && setCheckedPlayers ? <span /> : <span />}
                  {renderPlayerIdentity(player)}
                  <span className='text-center font-black text-zinc-100'>{player.armyCount}</span>
                  <span className='text-center text-zinc-300'>{player.landsCount}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
