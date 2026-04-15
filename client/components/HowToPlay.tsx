import React from 'react';
import { useTranslation } from 'next-i18next';
import { TileType, TileType2Image } from '@/lib/types';
import ModalShell from '@/components/ui/ModalShell';

interface HowToPlayProps {
  show: boolean;
  toggleShow: any;
}

const HowToPlay: React.FC<HowToPlayProps> = ({ show, toggleShow }) => {
  const { t } = useTranslation('common');

  const tableData = [
    { label: t('howToPlay.move'), value: t('howToPlay.wsad') },
    { label: t('howToPlay.openChat'), value: t('howToPlay.enter') },
    { label: t('howToPlay.surrender'), value: 'Esc' },
    { label: t('howToPlay.selectGeneral'), value: 'G' },
    { label: t('howToPlay.centerGeneral'), value: 'H' },
    { label: t('howToPlay.centerMap'), value: 'C' },
    { label: t('howToPlay.toggle50'), value: t('howToPlay.how-to-toggle-50') },
    { label: t('howToPlay.undoMove'), value: 'E' },
    { label: t('howToPlay.clearQueuedMoves'), value: 'Q' },
    { label: t('howToPlay.setZoom'), value: '1 / 2 / 3' },
    { label: t('howToPlay.zoomInOut'), value: t('howToPlay.mouse-wheel') },
  ];

  return (
    <ModalShell
      open={show}
      onClose={toggleShow}
      title={
        <div>
          <p className='bw-page-copy'>Field Manual</p>
          <h2 className='bw-title text-3xl md:text-5xl'>{t('howToPlay.title')}</h2>
        </div>
      }
      widthClassName='max-w-4xl'
    >
      <div className='space-y-6 text-sm text-zinc-200 md:text-base'>
        <div className='grid gap-6 md:grid-cols-[1.4fr_1fr]'>
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <span className='text-zinc-300'>{t('howToPlay.goal')}</span>
              <img
                src={TileType2Image[TileType.King]}
                alt='king'
                width={22}
                height={22}
                className='border border-zinc-800 bg-white'
                draggable={false}
              />
            </div>
            <ul className='space-y-2 border-l border-zinc-700 pl-4 text-zinc-300'>
              <li>{t('howToPlay.plains')}</li>
              <li className='flex items-center gap-2'>
                <img
                  src={TileType2Image[TileType.City]}
                  alt='city'
                  width={22}
                  height={22}
                  className='border border-zinc-800 bg-white'
                  draggable={false}
                />
                {t('howToPlay.cities')}
              </li>
              <li>{t('howToPlay.moves')}</li>
              <li>{t('howToPlay.capture')}</li>
            </ul>
          </div>

          <div className='border border-zinc-800 bg-zinc-950/70 p-4'>
            <p className='bw-page-copy mb-2'>Quick Notes</p>
            <div className='space-y-2 text-zinc-300'>
              <p>{t('howToPlay.openChat')}: Enter</p>
              <p>{t('howToPlay.surrender')}: Esc</p>
              <p>{t('howToPlay.toggle50')}: Z</p>
            </div>
          </div>
        </div>

        <div>
          <p className='bw-page-copy mb-3'>{t('howToPlay.shortcut')}</p>
          <div className='overflow-hidden border border-zinc-800'>
            <table className='w-full border-separate border-spacing-0'>
              <thead className='bg-zinc-950/80 text-left text-xs font-black uppercase tracking-[0.18em] text-zinc-500'>
                <tr>
                  <th className='px-4 py-3'>{t('howToPlay.shortcut')}</th>
                  <th className='px-4 py-3'>{t('howToPlay.key')}</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index} className='border-t border-zinc-800 even:bg-zinc-900/50'>
                    <td className='px-4 py-3'>{row.label}</td>
                    <td className='px-4 py-3 font-black text-yellow-300'>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default HowToPlay;
