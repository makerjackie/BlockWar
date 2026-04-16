import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
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

import { forceStartOK, MaxTeamNum, SpeedOptions } from '@/lib/constants';
import { useGame, useGameDispatch } from '@/context/GameContext';
import ModalShell from '@/components/ui/ModalShell';

interface GameSettingProps {}

const tabLabels = ['team', 'game', 'map', 'terrain', 'modifiers'] as const;

const tabButtonClass = (active: boolean) =>
  `bw-button min-h-11 px-3 text-xs ${active ? 'bw-button-primary' : 'bw-button-secondary'}`;

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
      className='flex min-h-12 items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50'
    >
      <span className='text-sm font-black uppercase tracking-[0.12em] text-zinc-200'>
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

const GameSetting: React.FC<GameSettingProps> = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isNameFocused, setIsNamedFocused] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [forceStart, setForceStart] = useState(false);
  const [openMapExplorer, setOpenMapExplorer] = useState(false);
  const [tutorialStarting, setTutorialStarting] = useState(false);

  const { room, socketRef, myPlayerId, myUserName, team } = useGame();
  const { roomDispatch, snackStateDispatch } = useGameDispatch();

  const { t } = useTranslation();

  const router = useRouter();

  useEffect(() => {
    setShareLink(window.location.href);
  }, []);

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

  const disabledUi: boolean = useMemo(() => {
    if (myPlayerId && room.players) {
      for (let i = 0; i < room.players.length; ++i) {
        if (room.players[i].id === myPlayerId) {
          return !room.players[i].isRoomHost;
        }
      }
    }
    return true;
  }, [myPlayerId, room]);

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
      console.log(`change_room_setting: ${property}, ${newValue}`);
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

  const handleChangeHost = (playerId: string, username: string) => {
    console.log(`change host to ${username}, id ${playerId}`);
    socketRef.current.emit('change_host', playerId);
  };

  const handleAddBot = () => {
    socketRef.current.emit('add_bot');
  };

  const handleRemoveBot = (playerId: string) => {
    socketRef.current.emit('remove_bot', playerId);
  };

  const handleLeaveRoom = () => {
    console.log('Leave Room');
    socketRef.current.disconnect();
    router.push(`/`);
  };

  const canManageBots = !disabledUi && !room.gameStarted;
  const forceStartTarget = getForceStartTarget(room);
  const roleLabel = disabledUi ? t('room-role-member') : t('room-role-host');
  const isTutorialRoom = room.preset === 'tutorial';
  const currentPlayer = room.players.find((player) => player.id === myPlayerId);
  const canStartTutorial =
    isTutorialRoom &&
    !disabledUi &&
    team !== MaxTeamNum + 1 &&
    !room.gameStarted;

  const handleStartTutorial = () => {
    if (!canStartTutorial) return;

    setTutorialStarting(true);
    socketRef.current.emit('start_tutorial');
  };

  useEffect(() => {
    if (!isTutorialRoom) {
      setTutorialStarting(false);
      return;
    }

    if (room.gameStarted || currentPlayer?.forceStart) {
      setTutorialStarting(false);
    }
  }, [currentPlayer?.forceStart, isTutorialRoom, room.gameStarted]);

  return (
    <div className='mx-auto w-full max-w-2xl'>
      <ModalShell
        open={openMapExplorer}
        onClose={() => setOpenMapExplorer(false)}
        title='Choose a Map'
        widthClassName='max-w-5xl'
      >
        <MapExplorer userId={myUserName} onSelect={handleMapSelect} />
      </ModalShell>

      <section className='menu-container overflow-hidden'>
        <div className='flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-5'>
          <div className='flex min-w-0 items-start gap-3'>
            <button
              type='button'
              className='grid size-11 shrink-0 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 transition hover:bg-yellow-300 hover:text-zinc-950'
              onClick={handleLeaveRoom}
              aria-label='Leave room'
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>

            <div className='min-w-0'>
              {!isNameFocused || disabledUi ? (
                <button
                  type='button'
                  className='max-w-full truncate text-left text-2xl font-black text-zinc-50'
                  onClick={() => {
                    if (!disabledUi) setIsNamedFocused(true);
                  }}
                >
                  {room.roomName}
                </button>
              ) : (
                <input
                  autoFocus
                  className='bw-input h-11 text-left text-xl'
                  value={room.roomName}
                  onChange={handleRoomNameChange}
                  onBlur={handleRoomNameBlur}
                  disabled={disabledUi}
                />
              )}
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <span
                  className={`inline-flex min-h-8 items-center gap-1.5 border px-3 text-[11px] font-black uppercase tracking-[0.16em] ${
                    disabledUi
                      ? 'border-zinc-700 bg-zinc-950/70 text-zinc-300'
                      : 'border-yellow-300 bg-yellow-300 text-zinc-950'
                  }`}
                >
                  {disabledUi ? (
                    <Users size={13} strokeWidth={2.3} />
                  ) : (
                    <Crown size={13} strokeWidth={2.3} />
                  )}
                  {roleLabel}
                </span>
                {disabledUi ? (
                  <span className='text-xs font-black uppercase tracking-[0.14em] text-zinc-500'>
                    {t('room-settings-host-only')}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type='button'
            className='grid size-11 shrink-0 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 transition hover:bg-yellow-300 hover:text-zinc-950'
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
            aria-label='Copy share link'
          >
            <Share2 size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className='space-y-4 px-4 py-4 sm:px-5'>
          {isTutorialRoom ? (
            <div className='space-y-4'>
              <div className='border border-yellow-300/30 bg-yellow-300/10 px-4 py-4'>
                <p className='bw-page-copy mb-2'>{t('tutorialSetup.badge')}</p>
                <h2 className='text-2xl font-black text-zinc-50'>
                  {t('tutorialSetup.title')}
                </h2>
                <p className='mt-2 text-sm text-zinc-300'>
                  {t('tutorialSetup.copy')}
                </p>
              </div>

              <div className='grid gap-3 sm:grid-cols-3'>
                <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-3'>
                  <p className='text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500'>
                    {t('tutorialSetup.speedLabel')}
                  </p>
                  <p className='mt-1 text-lg font-black text-yellow-300'>1x</p>
                </div>
                <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-3'>
                  <p className='text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500'>
                    {t('tutorialSetup.opponentLabel')}
                  </p>
                  <p className='mt-1 text-lg font-black text-yellow-300'>
                    {t('bot')}
                  </p>
                  <p className='mt-1 text-xs text-zinc-500'>
                    {t('tutorialSetup.opponentValue')}
                  </p>
                </div>
                <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-3'>
                  <p className='text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500'>
                    {t('tutorialSetup.fogLabel')}
                  </p>
                  <p className='mt-1 text-lg font-black text-yellow-300'>
                    {t('tutorialSetup.fogValue')}
                  </p>
                </div>
              </div>

              <p className='text-sm text-zinc-400'>
                {t('tutorialSetup.fogNote')}
              </p>

              <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-4'>
                <p className='bw-page-copy mb-2'>{t('tutorialSetup.goalLabel')}</p>
                <p className='text-sm leading-6 text-zinc-300'>
                  {t('tutorialSetup.goalCopy')}
                </p>
              </div>

              <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-4'>
                <p className='bw-page-copy mb-3'>{t('tutorialSetup.stepsLabel')}</p>
                <ol className='space-y-3 text-sm leading-6 text-zinc-300'>
                  <li>
                    <span className='mr-2 text-yellow-300'>1.</span>
                    {t('tutorialSetup.stepOne')}
                  </li>
                  <li>
                    <span className='mr-2 text-yellow-300'>2.</span>
                    {t('tutorialSetup.stepTwo')}
                  </li>
                  <li>
                    <span className='mr-2 text-yellow-300'>3.</span>
                    {t('tutorialSetup.stepThree')}
                  </li>
                </ol>
              </div>

              <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-4'>
                <p className='bw-page-copy mb-3'>{t('tutorialSetup.keysLabel')}</p>
                <div className='flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300'>
                  <span className='border border-zinc-700 px-3 py-2'>G · {t('tutorialSetup.keyG')}</span>
                  <span className='border border-zinc-700 px-3 py-2'>Z · {t('tutorialSetup.keyZ')}</span>
                  <span className='border border-zinc-700 px-3 py-2'>Q · {t('tutorialSetup.keyQ')}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className='flex items-center justify-between gap-3'>
                <p className='bw-page-copy'>{t('room-settings')}</p>
              </div>

              {room.mapName && (
                <div className='flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/60 px-4 py-3'>
                  <Link
                    href={`/maps/${room.mapId}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='truncate text-sm font-black uppercase tracking-[0.12em] text-yellow-300'
                  >
                    {t('custom-map')}: {room.mapName}
                  </Link>
                  {!disabledUi && (
                    <button
                      type='button'
                      className='grid size-9 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-50 transition hover:bg-red-500 hover:text-zinc-950'
                      onClick={clearRoomMap}
                      aria-label='Clear room map'
                    >
                      <Trash2 size={17} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}

              <div className='grid grid-cols-2 gap-2 min-[440px]:grid-cols-3 sm:flex sm:flex-wrap'>
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
                <div className='space-y-3'>
                  <p className='text-xs font-black uppercase tracking-[0.18em] text-zinc-500'>
                    {t('select-your-team')}
                  </p>
                  <div className='grid grid-cols-4 gap-2 sm:flex sm:flex-wrap'>
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
                      className={`${tabButtonClass(team === MaxTeamNum + 1)} col-span-2 w-full sm:w-auto`}
                      onClick={() => handleTeamChange(null, MaxTeamNum + 1)}
                    >
                      Spectators
                    </button>
                  </div>
                </div>
              </TabPanel>

              <TabPanel value={tabIndex} index={1}>
                <div className='space-y-4'>
                  <button
                    type='button'
                    className='bw-button bw-button-primary w-full'
                    disabled={disabledUi}
                    onClick={() => setOpenMapExplorer(true)}
                  >
                    {t('select-a-custom-map')}
                  </button>

                  <div className='space-y-3'>
                    <p className='text-xs font-black uppercase tracking-[0.18em] text-zinc-500'>
                      {t('game-speed')}
                    </p>
                    <div className='grid grid-cols-5 gap-2 sm:flex sm:flex-wrap'>
                      {SpeedOptions.map((value) => (
                        <button
                          key={value}
                          type='button'
                          className={`${tabButtonClass(room.gameSpeed === value)} w-full sm:w-auto`}
                          disabled={disabledUi}
                          onClick={(event) =>
                            handleSettingChange('gameSpeed')(event as unknown as Event, value)
                          }
                        >
                          {`${value}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabPanel>

              <TabPanel value={tabIndex} index={2}>
                <div className='space-y-4'>
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
              </TabPanel>

              <TabPanel value={tabIndex} index={3}>
                <div className='space-y-4'>
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
              </TabPanel>

              <TabPanel value={tabIndex} index={4}>
                <div className='space-y-4'>
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

                  <div className='grid gap-3'>
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
              </TabPanel>
            </>
          )}
        </div>
      </section>

      <section className='menu-container mt-4 overflow-hidden'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-5'>
          <div className='flex items-center gap-3'>
            <Users className='text-yellow-300' size={18} strokeWidth={2.25} />
            <div>
              <p className='bw-page-copy'>Roster</p>
              <h3 className='text-lg font-black text-zinc-50'>{t('players')}</h3>
            </div>
          </div>
          {!isTutorialRoom && (
            <button
              type='button'
              className='bw-button bw-button-secondary min-h-10 px-3 text-xs'
              disabled={!canManageBots || room.players.length >= room.maxPlayers}
              onClick={handleAddBot}
            >
              <Bot size={16} strokeWidth={2.5} />
              {t('add-bot')}
            </button>
          )}
        </div>
        <div className='px-4 py-4 sm:px-5'>
          <PlayerTable
            myPlayerId={myPlayerId}
            players={room.players}
            handleChangeHost={handleChangeHost}
            handleRemoveBot={handleRemoveBot}
            disabled_ui={disabledUi}
            canManageBots={canManageBots}
            warringStatesMode={room.warringStatesMode}
          />
        </div>
      </section>

      <button
        type='button'
        className={`bw-button mt-4 w-full justify-center text-base ${
          tutorialStarting || forceStart || !!currentPlayer?.forceStart
            ? 'bw-button-primary'
            : 'bw-button-secondary'
        }`}
        disabled={isTutorialRoom ? !canStartTutorial || tutorialStarting : team === MaxTeamNum + 1}
        onClick={isTutorialRoom ? handleStartTutorial : handleClickForceStart}
      >
        {isTutorialRoom
          ? tutorialStarting
            ? t('tutorialSetup.startingButton')
            : t('tutorialSetup.startButton')
          : `${t('ready')}(${room.forceStartNum}/${forceStartTarget})`}
      </button>
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
