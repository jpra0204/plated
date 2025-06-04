import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import "../styles/globals.css";
import NavBar from "../components/common/NavBar";


export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <NavBar />
      <div className="main-content">
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
