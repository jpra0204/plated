import React from 'react';
import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import { Layout } from '@/components/Layout/Layout'

import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';



export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
