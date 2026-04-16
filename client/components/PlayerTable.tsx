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

function getPlayerAvatarLabel(username: string) {
  const [firstCharacter] = Array.from(username.trim());
  return firstCharacter?.toUpperCase() ?? '?';
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

  const teams: Player[][] = Array.from({ length: MaxTeamNum + 2 }, () => []);
  players.forEach((player) => {
    teams[player.team] ??= [];
    teams[player.team].push(player);
  });

  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2 sm:gap-3'>
      {teams.map((teamPlayers, index) => {
        if (!teamPlayers || teamPlayers.length === 0) return null;
        const isSpectator = index > MaxTeamNum;
        return (
          <section
            key={index}
            className='min-w-0 border border-zinc-800 bg-zinc-950/60 p-2.5 sm:p-3'
          >
            <div className='mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 sm:mb-3 sm:text-[11px] sm:tracking-[0.18em]'>
              {isSpectator ? t('spectators') : t('team-number', { number: index })}
            </div>
            <div className='flex flex-col gap-1.5 sm:gap-2'>
              {teamPlayers.map((player) => {
                const isMine = player.id === myPlayerId;
                const disabled = player.isBot ? !canManageBots : disabled_ui;
                const playerColor = ColorArr[player.color];
                const isSpectator = player.team === MaxTeamNum + 1;
                const bgColor =
                  isSpectator
                    ? '#09090b'
                    : isMine
                      ? playerColor
                      : 'transparent';
                const textColor = isMine ? '#ffffff' : playerColor;
                const avatarBackgroundColor = isSpectator ? '#09090b' : playerColor;
                const avatarTextColor = isSpectator ? playerColor : '#ffffff';

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
                    className='flex min-h-9 items-center justify-between gap-1.5 border px-2.5 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:gap-2 sm:px-3 sm:py-2'
                    style={{
                      borderColor: playerColor,
                      backgroundColor: bgColor,
                    }}
                  >
                    <span className='flex min-w-0 items-center gap-2.5 sm:gap-3'>
                      <span
                        className='relative grid size-10 shrink-0 overflow-hidden border sm:size-11'
                        style={{
                          borderColor: playerColor,
                          backgroundColor: avatarBackgroundColor,
                        }}
                      >
                        {player.isRoomHost ? (
                          <span
                            className='absolute inset-x-0 top-0 flex h-4 items-center justify-center bg-zinc-950/85 px-1 text-[7px] font-black tracking-[0.08em] sm:text-[8px]'
                            style={{ color: playerColor }}
                          >
                            {t('room-role-host')}
                          </span>
                        ) : null}
                        <span
                          className={`grid h-full place-items-center font-black uppercase ${
                            player.isRoomHost ? 'pt-3 text-sm sm:pt-3.5' : 'text-base'
                          }`}
                          style={{ color: avatarTextColor }}
                        >
                          {getPlayerAvatarLabel(player.username)}
                        </span>
                      </span>

                      <span className='min-w-0'>
                        <span
                          className='block truncate text-[13px] font-black sm:text-sm'
                          style={{
                            color: textColor,
                            textDecoration: player.forceStart ? 'underline' : 'none',
                          }}
                        >
                          {warringStatesMode ? WarringStates[player.color] : ''}
                          {player.username}
                          {player.isBot ? ` · ${t('bot')}` : ''}
                        </span>
                        <span className='mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500'>
                          {isSpectator ? t('spectators') : t('team-number', { number: player.team })}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default PlayerTable;
