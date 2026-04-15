import { useTranslation } from 'next-i18next';

function Footer() {
  const { t } = useTranslation();
  const serverApi = process.env.NEXT_PUBLIC_SERVER_API ?? '';
  const chinaWebsite: boolean = serverApi.endsWith('cn');

  return (
    <footer className='fixed inset-x-0 bottom-0 z-20 border-t border-zinc-500/30 bg-zinc-950/90 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 backdrop-blur-xl'>
      <div>
        {t('all-right-reserved')} © 2022~{new Date().getFullYear()} BlockWar /
        方块战争 &nbsp;
        {t('open-source-team')}
      </div>
      {chinaWebsite && (
        <a className='text-yellow-300 hover:text-zinc-50' href='https://beian.miit.gov.cn'>
          粤ICP备2022122081号-2
        </a>
      )}
    </footer>
  );
}

export default Footer;
