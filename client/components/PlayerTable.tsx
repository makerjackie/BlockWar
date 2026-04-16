import { useTranslation } from 'next-i18next';
import { Crown } from 'lucide-react';

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
    <div className='flex flex-wrap gap-3'>
      {teams.map((teamPlayers, index) => {
        if (!teamPlayers || teamPlayers.length === 0) return null;
        const isSpectator = index > MaxTeamNum;
        return (
          <section
            key={index}
            className='min-w-[170px] border border-zinc-800 bg-zinc-950/60 p-3'
          >
            <div className='mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500'>
              {isSpectator ? 'Spectators' : `Team ${index}`}
            </div>
            <div className='flex flex-col gap-2'>
              {teamPlayers.map((player) => {
                const isMine = player.id === myPlayerId;
                const disabled = player.isBot ? !canManageBots : disabled_ui;
                const bgColor =
                  player.team === MaxTeamNum + 1
                    ? '#09090b'
                    : isMine
                      ? ColorArr[player.color]
                      : 'transparent';
                const textColor = isMine ? '#ffffff' : ColorArr[player.color];

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
                    className='flex min-h-10 items-center justify-between gap-2 border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60'
                    style={{
                      borderColor: ColorArr[player.color],
                      backgroundColor: bgColor,
                    }}
                  >
                    <span className='flex min-w-0 items-center gap-2'>
                      {player.isRoomHost ? (
                        <Crown
                          size={16}
                          strokeWidth={2.25}
                          style={{ color: textColor }}
                        />
                      ) : null}
                      <span
                        className='truncate text-sm font-black'
                        style={{
                          color: textColor,
                          textDecoration: player.forceStart ? 'underline' : 'none',
                        }}
                      >
                        {warringStatesMode ? WarringStates[player.color] : ''}
                        {player.username}
                        {player.isBot ? ` · ${t('bot')}` : ''}
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
