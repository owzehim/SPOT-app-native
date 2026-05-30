// app/+html.tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* 구버전 PWA와 맞추기 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#2563eb" />

        {/* iOS: 홈 화면 웹앱으로 인식시키는 태그 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UvA-IN" />

        {/* 홈 화면 아이콘 (경로는 웹 빌드 기준) */}
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* 우리가 직접 만드는 PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        <title>UvA-IN</title>

        <ScrollViewStyleReset />

        {/* 아주 얇은 서비스워커 등록 (캐싱 거의 안 함) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .catch(function () {
                      // ignore
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}