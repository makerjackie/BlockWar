import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { Player, LeaderBoardTable, UserData } from '@/lib/types';
import { ColorArr, MaxTeamNum, WarringStates } from '@/lib/constants';

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
  players: {
    color: number;
    username: string | null;
    armyCount: number;
    landsCount: number;
  }[];
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
    <section className='bw-side-dock absolute right-0 top-0 z-[110] min-w-[220px] overflow-hidden border-l border-b'>
      <button
        type='button'
        className='flex w-full items-center justify-between border-b border-zinc-800 px-4 py-3 text-left'
        onClick={() => setGameDockExpand((value) => !value)}
      >
        <span className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500'>
          Leaderboard
        </span>
        <span className='text-xs font-black text-yellow-300'>
          {gameDockExpand ? '−' : '+'}
        </span>
      </button>

      <div className='max-h-[45vh] overflow-auto'>
        <div className='grid grid-cols-[auto_1fr_auto_auto] gap-x-3 border-b border-zinc-800 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500'>
          {gameDockExpand && checkedPlayers && setCheckedPlayers ? <span>{t('view')}</span> : <span />}
          <span>{gameDockExpand ? t('player') : 'T'}</span>
          <span className='text-center'>{t('army')}</span>
          <span className='text-center'>{t('land')}</span>
        </div>

        {teams.map((team) => (
          <div key={team.id} className='border-b border-zinc-900/80'>
            <div className='grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 bg-zinc-950/80 px-4 py-2 text-sm font-black text-zinc-100'>
              {gameDockExpand && checkedPlayers && setCheckedPlayers ? (
                <input
                  type='checkbox'
                  className='size-4 accent-yellow-300'
                  checked={checkedPlayers.some(
                    (player) => player.team === String(team.id)
                  )}
                  onChange={(event) => toggleTeamVisibility(team, event.target.checked)}
                />
              ) : (
                <span />
              )}
              <span>
                {warringStatesMode ? WarringStates[team.players[0]?.color] + ' · ' : ''}
                {gameDockExpand ? `TEAM ${team.id}` : `T${team.id}`}
              </span>
              <span className='text-center text-yellow-300'>{team.armyCount}</span>
              <span className='text-center text-zinc-300'>{team.landsCount}</span>
            </div>

            {gameDockExpand &&
              team.players.map((player) => (
                <div
                  key={`${team.id}-${player.color}`}
                  className='grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 px-4 py-2 text-sm'
                >
                  {checkedPlayers && setCheckedPlayers ? <span /> : <span />}
                  <span
                    className='truncate border px-2 py-1 font-black'
                    style={{
                      backgroundColor: ColorArr[player.color],
                      borderColor: ColorArr[player.color],
                      color: player.color === 0 ? '#09090b' : '#fff',
                    }}
                  >
                    {player.username}
                  </span>
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
