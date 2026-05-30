// app/+html.jsx
import { Html, Head, Main, NextScript } from 'expo-router/html';

export default function Root({ children }) {
  return (
    <Html lang="ko">
      <Head>
        {/* 기본 설정 */}
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA / 테마 색상 / manifest */}
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS가 홈 화면 앱으로 인식하도록 하는 메타들 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UvA-IN" />

        {/* iOS 홈화면 아이콘 (현재 프로젝트 구조 기준 경로) */}
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        <title>UvA-IN 멤버십</title>
      </Head>
      <body>
        {/* Expo Router가 렌더링하는 실제 앱 콘텐츠 */}
        {children ?? <Main />}
        <NextScript />
      </body>
    </Html>
  );
}