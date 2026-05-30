// public/sw.js

// 설치 즉시 활성화
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 활성화 후 모든 클라이언트 제어 (캐싱 로직은 없음)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// fetch 이벤트는 그대로 통과시킴 (실제 캐시 X)
self.addEventListener('fetch', () => {
  // no-op
});