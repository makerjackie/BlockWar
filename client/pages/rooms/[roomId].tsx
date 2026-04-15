import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import GameRoom from '@/components/GameRoom';
import { GameProvider } from '@/context/GameContext';
import Head from 'next/head';

function RoomPage() {
  return (
    <>
      <Head>
        <title>Gaming Room | BlockWar / 方块战争</title>
      </Head>
      <GameProvider>
        <GameRoom />
      </GameProvider>
    </>
  );
}

export default RoomPage;

export async function getStaticProps(context: any) {
  // extract the locale identifier from the URL
  const { locale } = context;

  return {
    props: {
      // pass the translation props to the page component
      ...(await serverSideTranslations(locale)),
    },
  };
}
export const getStaticPaths = async () => {
  return {
    paths: [], //indicates that no page needs be created at build time
    fallback: 'blocking', //indicates the type of fallback
  };
};
