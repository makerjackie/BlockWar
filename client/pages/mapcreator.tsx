import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Navbar from '../components/Navbar';
import MapEditor from '@/components/game/MapEditor';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Map Creator | BlockWar / 方块战争</title>
      </Head>
      <Navbar />
      <MapEditor editMode={true} />
    </>
  );
}

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
