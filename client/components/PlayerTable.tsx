import { useTranslation } from 'next-i18next';

import { Player } from '@/lib/types';
import { ColorArr, MaxTeamNum, WarringStates } from '@/lib/constants';

interface PlayerTableProps {
  myPlayerId: string;
  players: Player[];
  handleChangeHost: any;
  handleRemoveBot: (playerId: string) => void;
  disabled_ui: boolean;
  canManageBots: boolean;
  warringStatesMode: boolean;
}

function comparePlayers(a: Player, b: Player, myPlayerId: string) {
  if (a.isRoomHost !== b.isRoomHost) return a.isRoomHost ? -1 : 1;

  const aIsMine = a.id === myPlayerId;
  const bIsMine = b.id === myPlayerId;
  if (aIsMine !== bIsMine) return aIsMine ? -1 : 1;

  const aIsSpectator = a.team === MaxTeamNum + 1;
  const bIsSpectator = b.team === MaxTeamNum + 1;
  if (aIsSpectator !== bIsSpectator) return aIsSpectator ? 1 : -1;

  if (a.team !== b.team) return a.team - b.team;
  if (a.isBot !== b.isBot) return a.isBot ? 1 : -1;

  return a.username.localeCompare(b.username, 'zh-Hans-CN');
}

function PlayerTable(props: PlayerTableProps) {
  const {
    myPlayerId,
    players,
    handleChangeHost,
    handleRemoveBot,
    disabled_ui,
    canManageBots,
    warringStatesMode,
  } = props;
  const { t } = useTranslation();

  const orderedPlayers = [...players].sort((a, b) => comparePlayers(a, b, myPlayerId));
  const occupiedTeams = Array.from(
    new Set(
      players
        .filter((player) => player.team <= MaxTeamNum)
        .map((player) => player.team)
        .sort((a, b) => a - b)
    )
  );
  const teamGroups = occupiedTeams.map((teamNumber) => ({
    key: `team-${teamNumber}`,
    label: t('team-number', { number: teamNumber }),
    players: orderedPlayers.filter((player) => player.team === teamNumber),
  }));
  const spectators = orderedPlayers.filter((player) => player.team === MaxTeamNum + 1);

  if (spectators.length > 0) {
    teamGroups.push({
      key: 'spectators',
      label: t('spectators'),
      players: spectators,
    });
  }

  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2 sm:gap-3'>
      {teamGroups.map((group) => (
        <section
          key={group.key}
          className='min-w-0 border border-zinc-800 bg-zinc-950/70 p-2.5 sm:p-3'
        >
          <div className='mb-2 flex items-center justify-between gap-2'>
            <span className='text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 sm:text-[11px]'>
              {group.label}
            </span>
            <span className='inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-zinc-700 px-2 text-[10px] font-black text-zinc-300'>
              {group.players.length}
            </span>
          </div>

          <div className='space-y-1.5'>
            {group.players.map((player) => {
              const isMine = player.id === myPlayerId;
              const disabled = player.isBot ? !canManageBots : disabled_ui;
              const playerColor = ColorArr[player.color];
              const displayName = warringStatesMode
                ? `${WarringStates[player.color]} ${player.username}`
                : player.username;
              const playerNameColor = isMine ? 'var(--bw-ink)' : 'var(--bw-ink-soft)';
              const playerBackgroundColor = isMine
                ? 'color-mix(in srgb, var(--bw-panel-strong) 76%, var(--bw-line-strong) 24%)'
                : undefined;

              return (
                <button
                  type='button'
                  key={player.id}
                  disabled={disabled}
                  title={
                    disabled
                      ? ''
                      : player.isBot
                        ? t('remove-bot')
                        : t('transfer-host')
                  }
                  onClick={() => {
                    if (player.isBot) {
                      handleRemoveBot(player.id);
                      return;
                    }
                    handleChangeHost(player.id, player.username);
                  }}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 border-l-2 bg-zinc-950/80 px-3 py-2 text-left transition disabled:cursor-default disabled:opacity-100 ${
                    disabled ? '' : 'hover:bg-zinc-900'
                  }`}
                  style={{
                    borderColor: playerColor,
                    backgroundColor: playerBackgroundColor,
                  }}
                >
                  <span className='min-w-0 flex items-center gap-2'>
                    <span
                      className='size-2 shrink-0 rounded-full'
                      style={{ backgroundColor: playerColor }}
                    />
                    <span
                      className='truncate text-sm font-black'
                      style={{ color: playerNameColor }}
                    >
                      {displayName}
                    </span>
                  </span>

                  <span className='flex shrink-0 flex-wrap items-center justify-end gap-1'>
                    {player.isRoomHost ? (
                      <span className='inline-flex min-h-5 items-center rounded-full bg-yellow-300 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-950'>
                        {t('room-role-host')}
                      </span>
                    ) : null}
                    {player.isBot ? (
                      <span className='inline-flex min-h-5 items-center rounded-full border border-zinc-700 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-300'>
                        {t('bot')}
                      </span>
                    ) : null}
                    {player.forceStart ? (
                      <span className='inline-flex min-h-5 items-center rounded-full border border-emerald-500/60 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-300'>
                        {t('ready')}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default PlayerTable;
