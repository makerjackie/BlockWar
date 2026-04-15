import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import GameReplay from '@/components/game/GameReplay';
import Head from 'next/head';

function ReplayPage() {
  return (
    <>
      <Head>
        <title>Replay | BlockWar / 方块战争</title>
      </Head>
      <GameReplay />
    </>
  );
}

export default ReplayPage;

export async function getServerSideProps(context: any) {
  // extract the locale identifier from the URL
  const { locale } = context;

  return {
    props: {
      // pass the translation props to the page component
      ...(await serverSideTranslations(locale)),
    },
  };
}
