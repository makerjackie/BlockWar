import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Navbar from '@/components/Navbar';
import MapEditor from '@/components/game/MapEditor';
import Head from 'next/head';

function ReplayPage() {
  return (
    <>
      <Head>
        <title>Custom Map | BlockWar / 方块战争</title>
      </Head>
      <Navbar />
      <MapEditor editMode={false} />
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
