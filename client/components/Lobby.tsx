import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Room, RoomPool } from '@/lib/types';
import { formatCreatorRoomName } from '@shared/game/room-names';
import type { RoomPreset } from '@shared/game/room-presets';
import { useTranslation } from 'next-i18next';
import { GraduationCap, Map as MapIcon, Plus } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import HolidayGreeting from '@/components/HolidayGreeting';
import {
  readOnboardingStatus,
  shouldShowOnboardingPrompt,
  type OnboardingStatus,
} from '@/lib/onboarding';

function Lobby() {
  const [rooms, setRooms] = useState<RoomPool>({});
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [username, setUsername] = useState('');
  const [createPresetLoading, setCreatePresetLoading] =
    useState<RoomPreset | null>(null);
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus | null>(null);
  const router = useRouter();

  const { t } = useTranslation();

  useEffect(() => {
    console.log('fetching rooms from: ', process.env.NEXT_PUBLIC_SERVER_API);
    const fetchRooms = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_API}/get_rooms`
        );

        const nextRooms = (await res.json()) as RoomPool;
        setRooms(nextRooms);
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        setSnackOpen(true);
        setSnackMessage(err.message);
      }
    };

    fetchRooms();
    const fetchInterval = setInterval(fetchRooms, 2000);
    return () => {
      clearInterval(fetchInterval);
    };
  }, []);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
      return;
    }
    setUsername(storedUsername);
  }, [router]);

  useEffect(() => {
    setOnboardingStatus(readOnboardingStatus());
  }, []);

  const sortedRooms = useMemo(() => {
    return Object.values(rooms).sort((a, b) => {
      if (a.gameStarted !== b.gameStarted) {
        return a.gameStarted ? 1 : -1;
      }

      if (a.players.length !== b.players.length) {
        return b.players.length - a.players.length;
      }

      return a.roomName.localeCompare(b.roomName, 'zh-Hans-CN');
    });
  }, [rooms]);

  const hasRooms = sortedRooms.length > 0;
  const roomCount = sortedRooms.length;

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
      const data = (await res.json()) as { roomId: string; message?: string };
      if (res.status === 200) {
        router.push(`/rooms/${data.roomId}`);
      } else {
        setCreatePresetLoading(null);
        setSnackOpen(true);
        setSnackMessage(data.message ?? 'Failed to create room');
      }
    } catch (err: any) {
      setCreatePresetLoading(null);
      setSnackOpen(true);
      setSnackMessage(err.message);
    }
  };

  const handleCreateMapClick = () => {
    router.push('/mapcreator');
  };

  const tutorialRecommended =
    onboardingStatus !== null && shouldShowOnboardingPrompt(onboardingStatus);
  const tutorialButtonClass = tutorialRecommended
    ? 'bw-button bw-button-primary w-full justify-center'
    : 'bw-button bw-button-secondary w-full justify-center';
  const createRoomButtonClass = tutorialRecommended
    ? 'bw-button bw-button-secondary w-full'
    : 'bw-button bw-button-primary w-full';
  const actionCopy = tutorialRecommended
    ? t('onboarding.copy')
    : t('empty-room-help');

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
          <section className='mx-auto w-full max-w-5xl'>
            <div className='mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
              <div>
                <p className='bw-page-copy'>Command Center</p>
                <h1 className='bw-title text-4xl md:text-6xl'>
                  {t('greet') + username}
                </h1>
              </div>
              <div
                className='border px-3 py-2 text-xs font-black uppercase tracking-[0.18em]'
                style={{
                  borderColor: 'var(--bw-line-strong)',
                  backgroundColor: 'var(--bw-panel-strong)',
                  color: 'var(--bw-muted)',
                }}
              >
                BlockWar / 方块战争
              </div>
            </div>

            <HolidayGreeting className='mb-4' />

            <div className='flex flex-col gap-4'>
              <section className='min-w-0'>
                <div className='menu-container overflow-hidden p-0'>
                  <div className='flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5 sm:py-4'>
                    <div className='flex min-w-0 items-center gap-2.5'>
                      <p className='bw-page-copy'>{t('lobby')}</p>
                      {!loading ? (
                        <span className='inline-flex min-h-6 items-center rounded-full border border-zinc-700 px-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 sm:text-[11px]'>
                          {roomCount}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type='button'
                      className='bw-button bw-button-secondary min-h-10 px-3 text-xs'
                      disabled={createPresetLoading !== null}
                      onClick={handleCreateMapClick}
                    >
                      <MapIcon size={16} strokeWidth={2.5} />
                      {t('create-map')}
                    </button>
                  </div>

                  <div className='relative flex max-h-[52vh] min-h-[16rem] flex-col overflow-auto xl:max-h-[60vh]'>
                    <table className='relative z-10 w-full border-separate border-spacing-0 text-left'>
                      <thead className='sticky top-0 bg-zinc-950/95 text-xs font-black uppercase tracking-[0.18em] text-zinc-500 backdrop-blur'>
                        <tr>
                          <th className='px-4 py-3'>{t('room-name')}</th>
                          <th className='hidden px-4 py-3 text-center sm:table-cell'>
                            {t('game-speed')}
                          </th>
                          <th className='px-4 py-3 text-center'>{t('players')}</th>
                          <th className='px-4 py-3 text-center'>{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody
                        className='divide-y'
                        style={{ borderColor: 'var(--bw-line)' }}
                      >
                        {joinLoading && (
                          <tr>
                            <td
                              className='px-4 py-8 text-center text-yellow-300'
                              colSpan={4}
                            >
                              {t('joining-room')}
                            </td>
                          </tr>
                        )}
                        {loading ? (
                          <tr>
                            <td
                              className='px-4 py-8 text-center text-zinc-400'
                              colSpan={4}
                            >
                              Loading rooms...
                            </td>
                          </tr>
                        ) : !hasRooms ? (
                          <tr>
                            <td className='px-4 py-8 text-center' colSpan={4}>
                              <div className='mx-auto flex max-w-xl flex-col items-center gap-3'>
                                <div>
                                  <p className='text-lg font-black text-zinc-100'>
                                    {t('no-rooms-available')}
                                  </p>
                                  <p className='mt-2 text-sm text-zinc-400'>
                                    {t('empty-room-help')}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          sortedRooms.map((room: Room) => (
                            <tr
                              key={room.id}
                              className='cursor-pointer transition hover:bg-yellow-300/10'
                              onClick={() => handleRoomClick(room.id)}
                            >
                              <td className='max-w-[min(50vw,28rem)] truncate px-4 py-3 font-black text-zinc-50'>
                                {room.roomName}
                              </td>
                              <td className='hidden px-4 py-3 text-center text-zinc-300 sm:table-cell'>
                                {room.gameSpeed}
                              </td>
                              <td className='px-4 py-3 text-center text-zinc-300'>
                                {`${room.players.length}/${room.maxPlayers}`}
                              </td>
                              <td
                                className={`bw-status-label px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] ${
                                  room.gameStarted
                                    ? 'text-yellow-300'
                                    : 'text-emerald-300'
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
                </div>
              </section>

              <aside>
                <section className='menu-container p-4 sm:p-5'>
                  <div>
                    <p className='bw-page-copy'>{t('play')}</p>
                    <p className='mt-3 text-sm leading-6 text-zinc-400'>
                      {actionCopy}
                    </p>
                  </div>

                  <div className='mt-4 grid gap-3'>
                    <button
                      type='button'
                      className={tutorialButtonClass}
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
                      className={createRoomButtonClass}
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
                      onClick={() => handleCreateRoomClick('warring_state')}
                    >
                      {t('create-warring-room')}
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default Lobby;
