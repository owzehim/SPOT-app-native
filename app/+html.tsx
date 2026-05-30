// app/+html.tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* 구버전 PWA와 동일한 viewport 설정 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* 브라우저/OS 테마 색 */}
        <meta name="theme-color" content="#2563eb" />

        {/* iOS PWA 관련 설정 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SPOT" />

        {/* 홈 화면 아이콘 (빌드 결과 보고 필요하면 경로 조정) */}
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />

        {/* Expo가 app.json 기반으로 생성하는 PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        <title>SPOT</title>

        {/* React Native ScrollView 기본 스타일 리셋 */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}