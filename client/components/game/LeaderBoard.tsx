import { useTranslation } from 'next-i18next';
import { type MouseEvent, useState } from 'react';
import { Player, LeaderBoardTable, UserData } from '@/lib/types';
import { ColorArr, WarringStates } from '@/lib/constants';

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
};

export default function LeaderBoard(props: LeaderBoardProps) {
  const {
    players,
    leaderBoardTable,
    checkedPlayers,
    setCheckedPlayers,
    warringStatesMode = false,
  } = props;
  const [gameDockExpand, setGameDockExpand] = useState(true);
  const { t } = useTranslation();

  if (!leaderBoardTable) return null;

  const fetchUsernameByColor = (color: number) => {
    const result = players.find((player) => player.color === color);
    return result ? result.username : null;
  };

  const teamsMap = new Map<number, TeamSummary>();
  leaderBoardTable.forEach((row) => {
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
      username: fetchUsernameByColor(row[0]),
      armyCount: row[2],
      landsCount: row[3],
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
      className={`bw-side-dock absolute right-0 top-0 z-[110] cursor-pointer overflow-hidden border-l border-b ${
        gameDockExpand ? 'min-w-[220px]' : 'min-w-[132px]'
      }`}
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

      <div className='max-h-[45vh] overflow-auto'>
        <div
          className={`grid grid-cols-[auto_1fr_auto_auto] border-b border-zinc-800 font-black uppercase text-zinc-500 ${
            isCompact
              ? 'gap-x-1.5 px-2 py-1 text-[9px] tracking-[0.12em]'
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
                renderPlayerBadge(team.players[0], !gameDockExpand)
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
                  className='grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 px-4 py-2 text-sm'
                >
                  {checkedPlayers && setCheckedPlayers ? <span /> : <span />}
                  {renderPlayerBadge(player)}
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
