import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState, useEffect, StrictMode } from 'react';
import { useRouter } from 'next/router';

import Navbar from '../components/Navbar';
import Login from '../components/Login';

import Lobby from '../components/Lobby';
import Head from 'next/head';

function normalizeRedirectTarget(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '';
  }

  return value;
}

export default function Home() {
  const [username, setUsername] = useState('');
  const router = useRouter();
  const push = router.push;
  const redirectTarget = normalizeRedirectTarget(router.query.redirect);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      const normalizedUsername = storedUsername.trim();
      if (!normalizedUsername) {
        return;
      }

      setUsername(normalizedUsername);
      if (redirectTarget) {
        void push(redirectTarget);
      }
    }
  }, [redirectTarget, push]);

  const handlePlayClick = (username: string) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return;
    }

    setUsername(normalizedUsername);
    if (typeof window !== 'undefined') {
      localStorage.setItem('username', normalizedUsername);
      localStorage.removeItem('playerId');
    }

    if (redirectTarget) {
      void push(redirectTarget);
    }
  };

  return (
    <StrictMode>
      <Head>
        <title>Home | BlockWar / 方块战争</title>
      </Head>
      <Navbar />
      {!username && (
        <Login username={username} handlePlayClick={handlePlayClick} />
      )}
      {username && <Lobby />}
    </StrictMode>
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
