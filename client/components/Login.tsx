import { useTranslation } from 'next-i18next';

import { useEffect, useState } from 'react';
import HolidayGreeting from './HolidayGreeting';

interface LoginProps {
  username: string;
  handlePlayClick: (username: string) => void;
}

const Login: React.FC<LoginProps> = (props) => {
  const { username, handlePlayClick } = props;
  const { t } = useTranslation();
  const [inputName, setInputName] = useState(username);

  useEffect(() => {
    setInputName(username);
  }, [username]);

  const normalizedName = inputName.trim();
  const canPlay = normalizedName.length > 0;

  const handleSubmit = () => {
    if (!canPlay) {
      return;
    }

    handlePlayClick(normalizedName);
  };

  const handleUsernameChange = (event: any) => {
    setInputName(event.target.value);
  };
  const handleInputKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <main className='grid min-h-dvh place-items-center px-4 py-28'>
      <div className='w-full max-w-3xl space-y-4'>
        <HolidayGreeting />
        <section className='relative w-full'>
          <div className='absolute -left-3 -top-3 hidden h-24 w-24 border-l-2 border-t-2 md:block' style={{ borderColor: 'var(--bw-ember)' }} />
          <div className='absolute -bottom-3 -right-3 hidden h-24 w-24 border-b-2 border-r-2 md:block' style={{ borderColor: 'var(--bw-red)' }} />
          <div className='bw-card-grid'>
            <div className='grid gap-8 md:grid-cols-[180px_1fr] md:items-center'>
              <div className='flex justify-center md:justify-start'>
                <div className='bw-brand-mark size-36'>
                  <img
                    src='/img/blockwar-mark.svg'
                    alt='BlockWar logo'
                    className='size-28'
                    draggable={false}
                  />
                </div>
              </div>

              <div className='space-y-6 text-center md:text-left'>
                <div>
                  <p className='bw-page-copy'>Realtime Territory Combat</p>
                  <h1 className='bw-title mt-2 text-5xl md:text-7xl'>
                    BlockWar
                  </h1>
                  <p className='mt-3 text-lg font-black' style={{ color: 'var(--bw-ember)' }}>
                    {t('welcome')}
                  </p>
                </div>

                <div className='grid gap-3'>
                  <label
                    className='text-xs font-black uppercase tracking-[0.26em] text-zinc-500'
                    htmlFor='username'
                  >
                    {t('username-placeholder')}
                  </label>
                  <input
                    className='bw-input'
                    id='username'
                    placeholder={t('username-placeholder')}
                    value={inputName}
                    onChange={handleUsernameChange}
                    onKeyDown={handleInputKeyDown}
                    maxLength={20}
                  />
                  {!canPlay ? (
                    <p className='text-sm font-black' style={{ color: 'var(--bw-ember)' }}>
                      {t('username-required')}
                    </p>
                  ) : null}
                  <button
                    type='button'
                    className='bw-button bw-button-primary w-full'
                    disabled={!canPlay}
                    onClick={handleSubmit}
                  >
                    {t('play')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
