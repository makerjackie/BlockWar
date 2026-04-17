import { useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';

import { Player } from '@/lib/types';
import { ColorArr, MaxTeamNum, WarringStates } from '@/lib/constants';

interface PlayerTableProps {
  myPlayerId: string;
  players: Player[];
  handleChangeHost: any;
  handleRemoveBot: (playerId: string) => void;
  handleKickPlayer: (playerId: string) => void;
  handlePlayerTeamChange: (playerId: string, team: number) => void;
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
    handleKickPlayer,
    handlePlayerTeamChange,
    disabled_ui,
    canManageBots,
    warringStatesMode,
  } = props;
  const { t } = useTranslation();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  const orderedPlayers = [...players].sort((a, b) => comparePlayers(a, b, myPlayerId));
  const selectedPlayer = useMemo(
    () => orderedPlayers.find((player) => player.id === selectedPlayerId) ?? null,
    [orderedPlayers, selectedPlayerId]
  );
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
    <div className='space-y-3'>
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
                const canSelect = player.isBot ? canManageBots : !disabled_ui;
                const isSelected = player.id === selectedPlayerId;
                const playerColor = ColorArr[player.color];
                const displayName = warringStatesMode
                  ? `${WarringStates[player.color]} ${player.username}`
                  : player.username;
                const playerNameColor = isMine ? 'var(--bw-ink)' : 'var(--bw-ink-soft)';
                const playerBackgroundColor = isSelected
                  ? 'color-mix(in srgb, var(--bw-panel-strong) 88%, var(--bw-line-strong) 12%)'
                  : isMine
                    ? 'color-mix(in srgb, var(--bw-panel-strong) 76%, var(--bw-line-strong) 24%)'
                    : undefined;

                return (
                  <button
                    type='button'
                    key={player.id}
                    onClick={() => {
                      if (!canSelect) return;
                      setSelectedPlayerId((current) => (current === player.id ? '' : player.id));
                    }}
                    className={`flex min-h-10 w-full items-center justify-between gap-3 border-l-2 bg-zinc-950/80 px-3 py-2 text-left transition ${
                      canSelect ? 'hover:bg-zinc-900' : 'cursor-default'
                    }`}
                    style={{
                      borderColor: playerColor,
                      backgroundColor: playerBackgroundColor,
                    }}
                    aria-pressed={isSelected}
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

      {selectedPlayer ? (
        <section className='border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 sm:text-[11px]'>
                {t('selected-player')}
              </p>
              <p className='mt-1 text-sm font-black text-zinc-100 sm:text-base'>
                {warringStatesMode
                  ? `${WarringStates[selectedPlayer.color]} ${selectedPlayer.username}`
                  : selectedPlayer.username}
              </p>
            </div>
            <span className='text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400'>
              {selectedPlayer.team === MaxTeamNum + 1
                ? t('spectators')
                : t('team-number', { number: selectedPlayer.team })}
            </span>
          </div>

          <div className='mt-3 flex flex-wrap gap-2'>
            {Array.from({ length: MaxTeamNum }, (_, index) => index + 1).map((team) => (
              <button
                key={`${selectedPlayer.id}-team-${team}`}
                type='button'
                onClick={() => handlePlayerTeamChange(selectedPlayer.id, team)}
                className={`bw-button min-h-10 px-3 text-[11px] tracking-[0.14em] sm:text-xs ${
                  selectedPlayer.team === team ? 'bw-button-primary' : 'bw-button-secondary'
                }`}
              >
                {t('team-number', { number: team })}
              </button>
            ))}
            <button
              type='button'
              onClick={() => handlePlayerTeamChange(selectedPlayer.id, MaxTeamNum + 1)}
              className={`bw-button min-h-10 px-3 text-[11px] tracking-[0.14em] sm:text-xs ${
                selectedPlayer.team === MaxTeamNum + 1
                  ? 'bw-button-primary'
                  : 'bw-button-secondary'
              }`}
            >
              {t('spectators')}
            </button>
          </div>

          <div className='mt-3 flex flex-wrap gap-2'>
            {!selectedPlayer.isBot && !selectedPlayer.isRoomHost ? (
              <>
                <button
                  type='button'
                  onClick={() => handleChangeHost(selectedPlayer.id, selectedPlayer.username)}
                  className='bw-button bw-button-secondary min-h-10 px-3 text-[11px] tracking-[0.14em] sm:text-xs'
                >
                  {t('transfer-host')}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    handleKickPlayer(selectedPlayer.id);
                    setSelectedPlayerId('');
                  }}
                  className='bw-button min-h-10 border-red-500/60 bg-red-500/10 px-3 text-[11px] tracking-[0.14em] text-red-200 hover:bg-red-500/20 sm:text-xs'
                >
                  {t('kick-player')}
                </button>
              </>
            ) : null}
            {selectedPlayer.isBot ? (
              <button
                type='button'
                onClick={() => {
                  handleRemoveBot(selectedPlayer.id);
                  setSelectedPlayerId('');
                }}
                className='bw-button bw-button-secondary min-h-10 px-3 text-[11px] tracking-[0.14em] sm:text-xs'
              >
                {t('remove-bot')}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default PlayerTable;
