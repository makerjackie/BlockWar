import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import GameRoom from '@/components/GameRoom';
import { GameProvider, useGame } from '@/context/GameContext';
import Head from 'next/head';

function RoomPageHead() {
  const router = useRouter();
  const { t } = useTranslation();
  const { room } = useGame();

  const roomId = typeof router.query.roomId === 'string' ? router.query.roomId : '';
  const roomName =
    room.id === roomId && room.roomName.trim().length > 0 ? room.roomName.trim() : '';
  const pageTitle =
    roomName || (roomId ? t('room-page-title-id', { roomId }) : t('room-page-title'));

  return (
    <Head>
      <title>{`${pageTitle} | BlockWar / 方块战争`}</title>
    </Head>
  );
}

function RoomPage() {
  return (
    <GameProvider>
      <RoomPageHead />
      <GameRoom />
    </GameProvider>
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
