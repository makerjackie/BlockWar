import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { formatCreatorRoomName } from '@shared/game/room-names';
import {
  ArrowLeft,
  Bot,
  Castle,
  Crown,
  Mountain,
  Share2,
  Trash2,
  Users,
  Waves,
} from 'lucide-react';

import SliderBox from './SliderBox';
import PlayerTable from './PlayerTable';
import MapExplorer from './game/MapExplorer';
import GameLoading from './GameLoading';

import { forceStartOK, MaxTeamNum, SpeedOptions } from '@/lib/constants';
import { useGame, useGameDispatch } from '@/context/GameContext';
import ModalShell from '@/components/ui/ModalShell';

interface GameSettingProps {
  onLeaveRoom: () => void;
}

const tabLabels = ['players-tab', 'map', 'terrain', 'rules'] as const;
const sectionLabelClass =
  'text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500 sm:text-xs sm:tracking-[0.18em]';
const tabButtonClass = (active: boolean) =>
  `bw-button min-h-10 px-2.5 text-[11px] tracking-[0.14em] sm:min-h-11 sm:px-3 sm:text-xs sm:tracking-[0.18em] ${
    active ? 'bw-button-primary' : 'bw-button-secondary'
  }`;

function getForceStartTarget(room: { players: { team: number; isBot?: boolean }[] }) {
  const activeHumans = room.players.filter(
    (player) => !player.isBot && player.team !== MaxTeamNum + 1
  ).length;
  const activeBots = room.players.filter(
    (player) => player.isBot && player.team !== MaxTeamNum + 1
  ).length;

  if (activeHumans === 0) {
    return 0;
  }

  return activeBots > 0
    ? activeHumans
    : forceStartOK[activeHumans] ?? activeHumans;
}

function ToggleRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onToggle}
      className='flex min-h-11 items-center justify-between gap-2.5 border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:gap-3 sm:px-4 sm:py-3'
    >
      <span className='text-[11px] font-black uppercase tracking-[0.1em] text-zinc-200 sm:text-sm sm:tracking-[0.12em]'>
        {label}
      </span>
      <span
        className={`h-6 w-12 border transition ${
          checked
            ? 'border-yellow-300 bg-yellow-300'
            : 'border-zinc-600 bg-zinc-900'
        }`}
      >
        <span
          className={`block h-full w-1/2 bg-zinc-950 transition-transform ${
            checked ? 'translate-x-full' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

function HostOnlyOverlay({
  locked,
  onLockedInteraction,
  ariaLabel,
  children,
}: {
  locked: boolean;
  onLockedInteraction: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className='relative'>
      {children}
      {locked ? (
        <button
          type='button'
          className='absolute inset-0 z-10 cursor-not-allowed bg-transparent'
          onClick={onLockedInteraction}
          aria-label={ariaLabel}
        />
      ) : null}
    </div>
  );
}

const GameSetting: React.FC<GameSettingProps> = ({ onLeaveRoom }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isNameFocused, setIsNamedFocused] = useState(false);
  const roomNameInputRef = useRef<HTMLInputElement | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [forceStart, setForceStart] = useState(false);
  const [openMapExplorer, setOpenMapExplorer] = useState(false);
  const [tutorialStarting, setTutorialStarting] = useState(false);
  const tutorialAutoStartRequestedRef = useRef(false);

  const { room, socketRef, myPlayerId, myUserName, team } = useGame();
  const { roomDispatch, snackStateDispatch } = useGameDispatch();

  const { t } = useTranslation();

  useEffect(() => {
    setShareLink(window.location.href);
  }, []);

  const showHostOnlyNotice = () => {
    snackStateDispatch({
      type: 'update',
      title: t('room-settings'),
      status: 'warning',
      message: t('not-host'),
      duration: 2500,
    });
  };

  const handleRoomNameBlur = () => {
    setIsNamedFocused(false);
    let name = room.roomName;

    const regex = /^[\s\u200B]+$/;
    if (!name || name === '' || regex.test(name)) {
      name = formatCreatorRoomName(myUserName);
      roomDispatch({
        type: 'update_property',
        payload: {
          property: 'roomName',
          value: name,
        },
      });
    }
    socketRef.current.emit('change_room_setting', 'roomName', name);
  };

  const handleTeamChange = (_: Event | null, newTeam: number) => {
    socketRef.current.emit('set_team', newTeam);
  };

  const handlePlayerTeamChange = (playerId: string, newTeam: number) => {
    socketRef.current.emit('set_player_team', playerId, newTeam);
  };

  const clearRoomMap = () => {
    socketRef.current.emit('change_room_setting', 'mapId', '');
  };

  const handleMapSelect = (mapId: string) => {
    socketRef.current.emit('change_room_setting', 'mapId', mapId);
    setOpenMapExplorer(false);
  };

  const handleClickForceStart = () => {
    setForceStart(!forceStart);
    socketRef.current.emit('force_start');
  };

  const currentPlayer = room.players.find((player) => player.id === myPlayerId);
  const disabledUi = !currentPlayer?.isRoomHost;

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    roomDispatch({
      type: 'update_property',
      payload: {
        property: 'roomName',
        value: event.target.value,
      },
    });
  };

  const handleSettingChange =
    (property: string) => (event: Event | null, newValue: any) => {
      if (property === 'gameSpeed') newValue = Number.parseFloat(newValue);
      roomDispatch({
        type: 'update_property',
        payload: {
          property,
          value: newValue,
        },
      });
      socketRef.current.emit('change_room_setting', property, newValue);
  };

  const handleChangeHost = (playerId: string, _username: string) => {
    socketRef.current.emit('change_host', playerId);
  };

  const handleAddBot = () => {
    socketRef.current.emit('add_bot');
  };

  const handleRemoveBot = (playerId: string) => {
    socketRef.current.emit('remove_bot', playerId);
  };

  const handleKickPlayer = (playerId: string) => {
    socketRef.current.emit('kick_player', playerId);
  };

  const handleLeaveRoom = () => {
    onLeaveRoom();
  };

  const canManageBots = !disabledUi && !room.gameStarted;
  const forceStartTarget = getForceStartTarget(room);
  const isTutorialRoom = room.preset === 'tutorial';
  const canStartTutorial =
    isTutorialRoom &&
    !disabledUi &&
    team !== MaxTeamNum + 1 &&
    !room.gameStarted;

  const handleStartTutorial = () => {
    if (!canStartTutorial) return;

    tutorialAutoStartRequestedRef.current = true;
    setTutorialStarting(true);
    socketRef.current.emit('start_tutorial');
  };

  useEffect(() => {
    if (!isTutorialRoom) {
      setTutorialStarting(false);
      tutorialAutoStartRequestedRef.current = false;
      return;
    }

    if (room.gameStarted) {
      setTutorialStarting(false);
      tutorialAutoStartRequestedRef.current = false;
    }
  }, [isTutorialRoom, room.gameStarted]);

  useEffect(() => {
    if (!canStartTutorial || tutorialAutoStartRequestedRef.current) return;

    tutorialAutoStartRequestedRef.current = true;
    setTutorialStarting(true);
    socketRef.current.emit('start_tutorial');
  }, [canStartTutorial, socketRef]);

  useEffect(() => {
    if (!isNameFocused || disabledUi) return;
    roomNameInputRef.current?.focus();
  }, [disabledUi, isNameFocused]);

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <ModalShell
        open={openMapExplorer}
        onClose={() => setOpenMapExplorer(false)}
        title={t('choose-map')}
        widthClassName='max-w-5xl'
      >
        <MapExplorer username={myUserName} onSelect={handleMapSelect} />
      </ModalShell>

      <div className='flex flex-col gap-4'>
        <section className='menu-container overflow-hidden'>
          <div className='grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 border-b border-zinc-800 px-3 py-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:gap-3 sm:px-5 sm:py-4'>
            <button
              type='button'
              className='grid size-10 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 transition hover:bg-yellow-300 hover:text-zinc-950 sm:size-11'
              onClick={handleLeaveRoom}
              aria-label={t('leave-room')}
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>

            {!isNameFocused || disabledUi ? (
              <button
                type='button'
                className='bw-title min-w-0 truncate text-center text-xl leading-none text-zinc-50 sm:text-2xl'
                title={disabledUi ? t('room-settings-host-only') : room.roomName}
                onClick={() => {
                  if (disabledUi) {
                    showHostOnlyNotice();
                    return;
                  }

                  setIsNamedFocused(true);
                }}
              >
                {room.roomName}
              </button>
            ) : (
              <input
                ref={roomNameInputRef}
                className='bw-input h-10 min-w-0 text-center text-lg sm:h-11 sm:text-xl'
                value={room.roomName}
                onChange={handleRoomNameChange}
                onBlur={handleRoomNameBlur}
                disabled={disabledUi}
              />
            )}

            <button
              type='button'
              className='grid size-10 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 transition hover:bg-yellow-300 hover:text-zinc-950 sm:size-11'
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                snackStateDispatch({
                  type: 'update',
                  title: '',
                  message: t('copied'),
                  status: 'success',
                  duration: 3000,
                });
              }}
              aria-label={t('copy-share-link')}
            >
              <Share2 size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className='space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 sm:py-4'>
            {isTutorialRoom ? (
              <div
                className='border px-3 py-4 sm:px-4 sm:py-5'
                style={{
                  borderColor: 'var(--bw-line-strong)',
                  backgroundColor: 'var(--bw-panel-strong)',
                  boxShadow: 'var(--bw-shadow)',
                }}
              >
                <div className='flex items-start gap-2.5 sm:gap-3'>
                  <div className='bw-brand-mark text-[color:var(--bw-ember)]'>
                    <Crown size={20} strokeWidth={2.25} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='bw-page-copy' style={{ color: 'var(--bw-ember)' }}>
                      {t('tutorialAutoStart.badge')}
                    </p>
                    <h2
                      className='mt-1 text-xl font-black sm:text-2xl'
                      style={{ color: 'var(--bw-ink)' }}
                    >
                      {t('tutorialAutoStart.title')}
                    </h2>
                    <p
                      className='mt-2 text-[13px] leading-5 sm:mt-3 sm:text-sm sm:leading-6'
                      style={{ color: 'var(--bw-ink-soft)' }}
                    >
                      {t('tutorialAutoStart.copy')}
                    </p>
                  </div>
                </div>

                <div className='mt-4 flex flex-wrap items-center justify-between gap-3 sm:mt-5'>
                  <p
                    className='text-[11px] font-black uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.16em]'
                    style={{ color: 'var(--bw-muted)' }}
                  >
                    {canStartTutorial
                      ? t('tutorialAutoStart.autoStarting')
                      : currentPlayer
                        ? t('tutorialAutoStart.waitingHost')
                        : t('tutorialAutoStart.connecting')}
                  </p>
                  <button
                    type='button'
                    className='bw-button bw-button-primary min-h-10 px-4 text-sm'
                    disabled={
                      !canStartTutorial ||
                      tutorialStarting ||
                      !!currentPlayer?.forceStart
                    }
                    onClick={handleStartTutorial}
                  >
                    {tutorialStarting || currentPlayer?.forceStart
                      ? t('tutorialAutoStart.startingButton')
                      : t('tutorialAutoStart.startButton')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className='flex items-center justify-between gap-3'>
                  <p className='bw-page-copy'>{t('room-settings')}</p>
                  {disabledUi ? (
                    <span
                      className='text-[11px] font-black uppercase tracking-[0.12em] sm:text-xs'
                      style={{ color: 'var(--bw-ember)' }}
                    >
                      {t('not-host')}
                    </span>
                  ) : null}
                </div>

                <div className='grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2'>
                  {tabLabels.map((tab, index) => (
                    <button
                      key={tab}
                      type='button'
                      className={`${tabButtonClass(tabIndex === index)} w-full sm:w-auto`}
                      onClick={() => setTabIndex(index)}
                    >
                      {t(tab)}
                    </button>
                  ))}
                </div>

                <TabPanel value={tabIndex} index={0}>
                  <div className='space-y-3 sm:space-y-4'>
                    <div className='space-y-2.5 sm:space-y-3'>
                      <p className={sectionLabelClass}>{t('select-your-team')}</p>
                      <div className='grid grid-cols-6 gap-1.5 sm:flex sm:flex-wrap sm:gap-2'>
                        {Array.from({ length: MaxTeamNum }, (_, i) => i + 1).map((value) => (
                          <button
                            key={value}
                            type='button'
                            className={`${tabButtonClass(team === value)} w-full sm:w-auto`}
                            onClick={() => handleTeamChange(null, value)}
                          >
                            {value}
                          </button>
                        ))}
                        <button
                          type='button'
                          className={`${tabButtonClass(team === MaxTeamNum + 1)} col-span-3 w-full sm:w-auto`}
                          onClick={() => handleTeamChange(null, MaxTeamNum + 1)}
                        >
                          {t('spectators')}
                        </button>
                      </div>
                    </div>

                    <div className='space-y-2.5 sm:space-y-3'>
                      <HostOnlyOverlay
                        locked={disabledUi}
                        onLockedInteraction={showHostOnlyNotice}
                        ariaLabel={t('room-settings-host-only')}
                      >
                        <SliderBox
                          label={t('max-player-num')}
                          value={room.maxPlayers}
                          disabled={disabledUi}
                          min={2}
                          max={12}
                          step={1}
                          marks={Array.from({ length: 11 }, (_, i) => ({
                            value: i + 2,
                            label: `${i + 2}`,
                          }))}
                          handleChange={handleSettingChange('maxPlayers')}
                        />
                      </HostOnlyOverlay>
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                  <div className='space-y-3 sm:space-y-4'>
                    <div className='space-y-2.5 sm:space-y-3'>
                      <p className={sectionLabelClass}>{t('select-a-custom-map')}</p>
                      <HostOnlyOverlay
                        locked={disabledUi}
                        onLockedInteraction={showHostOnlyNotice}
                        ariaLabel={t('room-settings-host-only')}
                      >
                        <button
                          type='button'
                          className='bw-button bw-button-primary w-full'
                          disabled={disabledUi}
                          onClick={() => setOpenMapExplorer(true)}
                        >
                          {t('select-a-custom-map')}
                        </button>
                      </HostOnlyOverlay>

                      {room.mapName ? (
                        <div className='flex items-center justify-between gap-2 border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3'>
                          <Link
                            href={`/maps/${room.mapId}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='truncate text-[11px] font-black uppercase tracking-[0.1em] text-yellow-300 sm:text-sm sm:tracking-[0.12em]'
                          >
                            {t('custom-map')}: {room.mapName}
                          </Link>
                          {!disabledUi && (
                            <button
                              type='button'
                              className='grid size-8 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 transition hover:bg-red-500 hover:text-zinc-950 sm:size-9'
                              onClick={clearRoomMap}
                              aria-label={t('clear-room-map')}
                            >
                              <Trash2 size={17} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className='text-sm text-zinc-500'>{t('map-random-default')}</p>
                      )}
                    </div>

                    <div className='space-y-3 sm:space-y-4'>
                      <p className={sectionLabelClass}>{t('map-size')}</p>
                      <HostOnlyOverlay
                        locked={disabledUi}
                        onLockedInteraction={showHostOnlyNotice}
                        ariaLabel={t('room-settings-host-only')}
                      >
                        <div className='space-y-3 sm:space-y-4'>
                          <SliderBox
                            label={t('height')}
                            value={room.mapWidth}
                            disabled={disabledUi}
                            handleChange={handleSettingChange('mapWidth')}
                          />
                          <SliderBox
                            label={t('width')}
                            value={room.mapHeight}
                            disabled={disabledUi}
                            handleChange={handleSettingChange('mapHeight')}
                          />
                        </div>
                      </HostOnlyOverlay>
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value={tabIndex} index={2}>
                  <HostOnlyOverlay
                    locked={disabledUi}
                    onLockedInteraction={showHostOnlyNotice}
                    ariaLabel={t('room-settings-host-only')}
                  >
                    <div className='space-y-3 sm:space-y-4'>
                      <SliderBox
                        label={t('mountain')}
                        value={room.mountain}
                        disabled={disabledUi}
                        handleChange={handleSettingChange('mountain')}
                        icon={<Mountain size={16} strokeWidth={2.25} />}
                      />
                      <SliderBox
                        label={t('city')}
                        value={room.city}
                        disabled={disabledUi}
                        handleChange={handleSettingChange('city')}
                        icon={<Castle size={16} strokeWidth={2.25} />}
                      />
                      <SliderBox
                        label={t('swamp')}
                        value={room.swamp}
                        disabled={disabledUi}
                        handleChange={handleSettingChange('swamp')}
                        icon={<Waves size={16} strokeWidth={2.25} />}
                      />
                    </div>
                  </HostOnlyOverlay>
                </TabPanel>

                <TabPanel value={tabIndex} index={3}>
                  <HostOnlyOverlay
                    locked={disabledUi}
                    onLockedInteraction={showHostOnlyNotice}
                    ariaLabel={t('room-settings-host-only')}
                  >
                    <div className='space-y-3 sm:space-y-4'>
                      <div className='space-y-2.5 sm:space-y-3'>
                        <p className={sectionLabelClass}>{t('game-speed')}</p>
                        <div className='grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2'>
                          {SpeedOptions.map((value) => (
                            <button
                              key={value}
                              type='button'
                              className={`${tabButtonClass(room.gameSpeed === value)} w-full sm:w-auto`}
                              disabled={disabledUi}
                              onClick={(event) =>
                                handleSettingChange('gameSpeed')(
                                  event as unknown as Event,
                                  value
                                )
                              }
                            >
                              {`${value}x`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className='grid gap-2.5 sm:gap-3'>
                        <ToggleRow
                          label={t('fog-of-war')}
                          checked={room.fogOfWar}
                          disabled={disabledUi}
                          onToggle={() =>
                            handleSettingChange('fogOfWar')(null, !room.fogOfWar)
                          }
                        />
                        <ToggleRow
                          label={t('reveal-king')}
                          checked={room.revealKing}
                          disabled={disabledUi}
                          onToggle={() =>
                            handleSettingChange('revealKing')(null, !room.revealKing)
                          }
                        />
                        <ToggleRow
                          label={t('death-spectator')}
                          checked={room.deathSpectator}
                          disabled={disabledUi}
                          onToggle={() =>
                            handleSettingChange('deathSpectator')(
                              null,
                              !room.deathSpectator
                            )
                          }
                        />
                        <ToggleRow
                          label={t('warring-states-mode')}
                          checked={room.warringStatesMode}
                          disabled={disabledUi}
                          onToggle={() =>
                            handleSettingChange('warringStatesMode')(
                              null,
                              !room.warringStatesMode
                            )
                          }
                        />
                      </div>
                    </div>
                  </HostOnlyOverlay>
                </TabPanel>
              </>
            )}
          </div>
        </section>

        {!isTutorialRoom && (
          <aside className='space-y-3'>
            <section className='menu-container overflow-hidden'>
              <div className='flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-800 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4'>
                <div className='flex items-center gap-2.5 sm:gap-3'>
                  <Users className='text-yellow-300' size={16} strokeWidth={2.25} />
                  <div className='flex items-center gap-2'>
                    <h3 className='text-base font-black text-zinc-50 sm:text-lg'>
                      {t('players')}
                    </h3>
                    <span className='inline-flex min-h-6 items-center rounded-full border border-zinc-700 px-2 text-[11px] font-black text-zinc-300'>
                      {room.players.length}/{room.maxPlayers}
                    </span>
                  </div>
                </div>
                <button
                  type='button'
                  className='bw-button bw-button-secondary min-h-9 px-2.5 text-[11px] sm:min-h-10 sm:px-3 sm:text-xs'
                  disabled={room.gameStarted || room.players.length >= room.maxPlayers}
                  onClick={() => {
                    if (disabledUi) {
                      showHostOnlyNotice();
                      return;
                    }

                    handleAddBot();
                  }}
                >
                  <Bot size={16} strokeWidth={2.5} />
                  {t('add-bot')}
                </button>
              </div>
              <div className='px-3 py-3 sm:px-4 sm:py-4'>
                <PlayerTable
                  myPlayerId={myPlayerId}
                  players={room.players}
                  handleChangeHost={handleChangeHost}
                  handleRemoveBot={handleRemoveBot}
                  handleKickPlayer={handleKickPlayer}
                  handlePlayerTeamChange={handlePlayerTeamChange}
                  disabled_ui={disabledUi}
                  canManageBots={canManageBots}
                  warringStatesMode={room.warringStatesMode}
                  onHostOnlyInteraction={showHostOnlyNotice}
                />
              </div>
            </section>

            <div className='border border-zinc-800 bg-zinc-950/95 p-2 backdrop-blur'>
              <button
                type='button'
                className={`bw-button min-h-11 w-full justify-center text-sm sm:text-base ${
                  tutorialStarting || forceStart || !!currentPlayer?.forceStart
                    ? 'bw-button-primary'
                    : 'bw-button-secondary'
                }`}
                disabled={team === MaxTeamNum + 1}
                onClick={handleClickForceStart}
              >
                {`${t('ready')}(${room.forceStartNum}/${forceStartTarget})`}
              </button>
            </div>

            <GameLoading variant='embedded' showStatusLabel={false} />
          </aside>
        )}

        {isTutorialRoom && <GameLoading variant='embedded' showStatusLabel={false} />}
      </div>
    </div>
  );
};

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  if (value !== index) return null;

  return (
    <div
      role='tabpanel'
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {children}
    </div>
  );
}

export default GameSetting;
