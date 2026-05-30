// app/+html.tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* 구버전 PWA와 최대한 동일한 viewport 설정 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* 브라우저 상단 색상 (안드로이드 등) */}
        <meta name="theme-color" content="#2563eb" />

        {/* iOS PWA: 홈 화면에서 완전 앱처럼 보이게 하는 설정들 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SPOT" />

        {/* 홈 화면 아이콘 (경로는 실제 빌드 결과에 맞게 조정 가능) */}
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />

        {/* Expo가 app.json 기반으로 생성하는 manifest */}
        <link rel="manifest" href="/manifest.json" />

        <title>SPOT</title>

        {/* RN ScrollView 기본 스타일 리셋 */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}