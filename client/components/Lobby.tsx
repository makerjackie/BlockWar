import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Room, RoomPool } from '@/lib/types';
import { formatCreatorRoomName } from '@shared/game/room-names';
import type { RoomPreset } from '@shared/game/room-presets';
import { useTranslation } from 'next-i18next';
import { GraduationCap, HardDrive, Plus, Map as MapIcon } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import HolidayGreeting from '@/components/HolidayGreeting';
import {
  readOnboardingStatus,
  shouldShowOnboardingPrompt,
  type OnboardingStatus,
} from '@/lib/onboarding';

function getServerDisplayUrl(serverApi: string) {
  if (typeof window === 'undefined') {
    return serverApi.replace(/\/api\/?$/, '') || '/';
  }

  const origin = window.location.origin;

  try {
    const url = new URL(serverApi || origin, origin);

    if (url.pathname === '/api') {
      url.pathname = '/';
    } else if (url.pathname.endsWith('/api')) {
      url.pathname = url.pathname.slice(0, -4) || '/';
    }

    return url.toString();
  } catch {
    return origin;
  }
}

function Lobby() {
  const [rooms, setRooms] = useState<RoomPool>({});
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [username, setUsername] = useState('');
  const [serverStatus, setServerStatus] = useState(true);
  const [createPresetLoading, setCreatePresetLoading] =
    useState<RoomPreset | null>(null);
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus | null>(null);
  const router = useRouter();

  const { t } = useTranslation();
  const serverDisplayUrl = getServerDisplayUrl(
    process.env.NEXT_PUBLIC_SERVER_API ?? ''
  );

  useEffect(() => {
    console.log('fetching rooms from: ', process.env.NEXT_PUBLIC_SERVER_API);
    const fetchRooms = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_API}/get_rooms`
        );

        const rooms = (await res.json()) as RoomPool;
        setRooms(rooms);
        setLoading(false);
        setServerStatus(true);
      } catch (err: any) {
        setLoading(false);
        setSnackOpen(true);
        setSnackMessage(err.message);
        setServerStatus(false);
      }
    };
    fetchRooms();
    let fetchInterval = setInterval(fetchRooms, 2000);
    return () => {
      clearInterval(fetchInterval);
    };
  }, []);

  useEffect(() => {
    let tmp: string | null = localStorage.getItem('username');
    if (!tmp) {
      router.push('/');
    } else {
      setUsername(tmp);
    }
  }, [setUsername, router]);

  useEffect(() => {
    setOnboardingStatus(readOnboardingStatus());
  }, []);

  const handleRoomClick = async (roomName: string) => {
    setJoinLoading(true);
    await router.push(`/rooms/${roomName}`);
  };

  const handleCreateRoomClick = async (preset: RoomPreset = 'standard') => {
    try {
      setCreatePresetLoading(preset);
      const params = new URLSearchParams();
      params.set(
        'name',
        preset === 'tutorial'
          ? t('tutorial-room-name')
          : formatCreatorRoomName(username)
      );
      params.set('creator', username);
      if (preset !== 'standard') {
        params.set('preset', preset);
      }
      const query = params.toString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_API}/create_room${query ? `?${query}` : ''}`
      );
      let data = (await res.json()) as { roomId: string; message?: string };
      if (res.status === 200) {
        router.push(`/rooms/${data.roomId}`);
      } else {
        setCreatePresetLoading(null);
        setSnackOpen(true);
        setSnackMessage(data.message ?? 'Failed to create room');
        setServerStatus(true);
      }
    } catch (err: any) {
      setCreatePresetLoading(null);
      setSnackOpen(true);
      setSnackMessage(err.message);
      setServerStatus(false);
    }
  };
  const tutorialRecommended =
    onboardingStatus !== null && shouldShowOnboardingPrompt(onboardingStatus);

  return (
    <>
      <Toast
        open={snackOpen}
        duration={1000}
        status='error'
        message={snackMessage}
        onClose={() => {
          setSnackOpen(false);
        }}
      />
      <main className='app-container'>
        <div className='center-layout justify-center'>
          <section className='w-full max-w-4xl'>
            <div className='mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
              <div>
                <p className='bw-page-copy'>Command Center</p>
                <h1 className='bw-title text-4xl md:text-6xl'>
                  {t('greet') + username}
                </h1>
              </div>
              <div className='border px-3 py-2 text-xs font-black uppercase tracking-[0.18em]' style={{ borderColor: 'var(--bw-line-strong)', backgroundColor: 'var(--bw-panel-strong)', color: 'var(--bw-muted)' }}>
                BlockWar / 方块战争
              </div>
            </div>

            <HolidayGreeting className='mb-4' />

            <div className='menu-container relative mb-4 flex flex-col gap-3 overflow-hidden p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
              <div className='relative z-10 flex min-w-0 items-center gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center border border-yellow-300/30 bg-yellow-300/10 text-yellow-300'>
                  <HardDrive size={18} strokeWidth={2.25} />
                </div>
                <div className='min-w-0'>
                  <div className='text-xs font-black uppercase tracking-[0.24em] text-zinc-500'>
                    {t('gserver')}
                  </div>
                  <div className='truncate text-sm font-medium text-zinc-100 sm:text-base'>
                    {serverDisplayUrl}
                  </div>
                </div>
              </div>
              <div className='relative z-10 inline-flex w-fit items-center gap-2 self-start border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] sm:self-auto'>
                <span
                  className={`size-3 border border-zinc-950 ${
                    serverStatus ? 'bg-emerald-400' : 'bg-red-500'
                  }`}
                />
                <span
                  className={`bw-status-label ${serverStatus ? 'text-emerald-300' : 'text-red-300'}`}
                >
                  {serverStatus ? t('online') : t('offline')}
                </span>
              </div>
            </div>

            <div className='menu-container relative flex max-h-[50vh] min-h-[18rem] flex-col overflow-auto p-0'>
              <table className='relative z-10 w-full border-separate border-spacing-0 text-left'>
                <thead className='sticky top-0 bg-zinc-950/95 text-xs font-black uppercase tracking-[0.18em] text-zinc-500 backdrop-blur'>
                  <tr>
                    <th className='px-4 py-3'>{t('room-name')}</th>
                    <th className='px-4 py-3 text-center'>{t('game-speed')}</th>
                    <th className='px-4 py-3 text-center'>{t('players')}</th>
                    <th className='px-4 py-3 text-center'>{t('status')}</th>
                  </tr>
                </thead>
                <tbody className='divide-y' style={{ borderColor: 'var(--bw-line)' }}>
                  {joinLoading && (
                    <tr>
                      <td className='px-4 py-8 text-center text-yellow-300' colSpan={4}>
                        {t('joining-room')}
                      </td>
                    </tr>
                  )}
                  {loading ? (
                    <tr>
                      <td className='px-4 py-8 text-center text-zinc-400' colSpan={4}>
                        Loading rooms...
                      </td>
                    </tr>
                  ) : Object.keys(rooms).length === 0 ? (
                    <tr>
                      <td className='px-4 py-8 text-center' colSpan={4}>
                        <div className='mx-auto flex max-w-xl flex-col items-center gap-4'>
                          <div>
                            <p className='text-lg font-black text-zinc-100'>
                              {t('no-rooms-available')}
                            </p>
                            <p className='mt-2 text-sm text-zinc-400'>
                              {t('empty-room-help')}
                            </p>
                          </div>
                          <div className='flex flex-col gap-3 sm:flex-row'>
                            <button
                              type='button'
                              className='bw-button bw-button-secondary'
                              disabled={createPresetLoading !== null}
                              onClick={() => handleCreateRoomClick('tutorial')}
                            >
                              <GraduationCap size={16} strokeWidth={2.5} />
                              {createPresetLoading === 'tutorial'
                                ? t('onboarding.creatingTutorial')
                                : t('onboarding.startTutorial')}
                            </button>
                            <button
                              type='button'
                              className='bw-button bw-button-primary'
                              disabled={createPresetLoading !== null}
                              onClick={() => handleCreateRoomClick()}
                            >
                              <Plus size={16} strokeWidth={2.5} />
                              {t('create-room')}
                            </button>
                            <button
                              type='button'
                              className='bw-button bw-button-secondary'
                              disabled={createPresetLoading !== null}
                              onClick={() => handleCreateRoomClick('warring_state')}
                            >
                              {t('create-warring-room')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    Object.values(rooms).map((room: Room) => (
                      <tr
                        key={room.id}
                        className='cursor-pointer transition hover:bg-yellow-300/10'
                        onClick={() => handleRoomClick(room.id)}
                      >
                        <td className='max-w-[45vw] truncate px-4 py-3 font-black text-zinc-50'>
                          {room.roomName}
                        </td>
                        <td className='px-4 py-3 text-center text-zinc-300'>
                          {room.gameSpeed}
                        </td>
                        <td className='px-4 py-3 text-center text-zinc-300'>{`${room.players.length}/${room.maxPlayers}`}</td>
                        <td
                          className={`bw-status-label px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] ${
                            room.gameStarted ? 'text-yellow-300' : 'text-emerald-300'
                          }`}
                        >
                          {room.gameStarted ? t('started') : t('waiting')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className='mt-4 grid gap-3 md:grid-cols-3'>
              <button
                type='button'
                className='bw-button bw-button-secondary w-full justify-center'
                disabled={createPresetLoading !== null}
                onClick={() => handleCreateRoomClick('tutorial')}
              >
                <GraduationCap size={16} strokeWidth={2.5} />
                {createPresetLoading === 'tutorial'
                  ? t('onboarding.creatingTutorial')
                  : t('onboarding.startTutorial')}
                {tutorialRecommended ? (
                  <span className='ml-1 border border-yellow-300/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-yellow-300'>
                    {t('onboarding.tutorialBadge')}
                  </span>
                ) : null}
              </button>
              <button
                type='button'
                className='bw-button bw-button-primary w-full'
                disabled={createPresetLoading !== null}
                onClick={() => handleCreateRoomClick()}
              >
                <Plus size={16} strokeWidth={2.5} />
                {t('create-room')}
              </button>
              <button
                type='button'
                className='bw-button bw-button-secondary w-full'
                disabled={createPresetLoading !== null}
                onClick={() => {
                  router.push('/mapcreator');
                }}
              >
                <MapIcon size={16} strokeWidth={2.5} />
                {t('create-map')}
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default Lobby;
