import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider, EmotionCache } from '@emotion/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider as LogosThemeProvider } from '@/context/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import NextNProgress from 'nextjs-progressbar';
import Head from 'next/head';
import { CookieConsent } from '@/components/gdpr/CookieConsent';
import theme from '@/styles/theme';
import createEmotionCache from '@/lib/createEmotionCache';
// Import CSS files before Material-UI to ensure proper cascading
import '@/styles/globals.css';
import '@/styles/logos-theme.css';
import '@/styles/index-html-complete.css';
import MainLayout from '@/components/Layout/MainLayout';
import SimpleLayout from '@/components/Layout/SimpleLayout';
import GlobalStyles from '@/components/GlobalStyles';

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps, router } = props;

  useEffect(() => {
    // Remove server-side injected CSS
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement?.removeChild(jssStyles);
    }
  }, []);

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>LOGOS Ecosystem - AI-Powered Platform</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
        <meta name="description" content="Experience the next generation of AI-powered solutions with LOGOS Ecosystem. 100+ intelligent agents, quantum-resistant security, and adaptive interfaces." />
        <meta name="emotion-insertion-point" content="" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      </Head>
      
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        <NextNProgress
          color="#4870FF"
          startPosition={0.3}
          stopDelayMs={200}
          height={3}
          showOnShallow={true}
          options={{ easing: 'ease', speed: 500 }}
        />
        <LogosThemeProvider>
          <AuthProvider>
            <WebSocketProvider>
              <NotificationProvider>
              {router.pathname.startsWith('/auth') ? (
                <>
                  <AnimatePresence mode="wait" initial={false}>
                    <Component {...pageProps} key={router.asPath} />
                  </AnimatePresence>
                  <CookieConsent />
                </>
              ) : (
                <SimpleLayout>
                  <AnimatePresence mode="wait" initial={false}>
                    <Component {...pageProps} key={router.asPath} />
                  </AnimatePresence>
                  <CookieConsent />
                </SimpleLayout>
              )}
              </NotificationProvider>
            </WebSocketProvider>
          </AuthProvider>
        </LogosThemeProvider>
      </MuiThemeProvider>
    </CacheProvider>
  );
}