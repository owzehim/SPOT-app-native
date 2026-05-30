// app/_layout.jsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../src/lib/supabase';
import '../global.css';
import { I18nProvider } from '@/i18n/LanguageContext';
import { Head } from 'expo-router/head'; // ✅ 추가

// 로그인 상태를 보고 어디로 보낼지 결정하는 Gate
function AuthGate() {
  const [session, setSession] = useState(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    const currentRoute = segments[0];

    if (!session) {
      // 비로그인 상태에서 접근 못 하게 막을 페이지들
      if (
        currentRoute === 'member' ||
        currentRoute === 'admin' ||
        currentRoute === 'scan'
      ) {
        router.replace('/public');
      }
    } else {
      // 로그인 상태에서 login 페이지로 가면 member로 보내기
      if (currentRoute === 'login') {
        router.replace('/member');
      }
    }
  }, [session, segments]);

  if (session === undefined) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: '#6b7280' }}>로딩 중...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

// 앱 전체 루트 레이아웃
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ✅ iOS PWA 인식을 위한 head 메타/아이콘 지정 */}
      <Head>
        {/* iOS가 홈 화면 앱으로 인식하도록 하는 플래그들 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UvA-IN" />
        <meta name="theme-color" content="#2563eb" />

        {/* 아이콘 (새 프로젝트 구조에 맞게 경로 지정) */}
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* 필요한 경우 viewport 중복 정의 (이미 있어도 문제는 없음) */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </Head>

      <SafeAreaProvider>
        <I18nProvider>
          <AuthGate />
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

if (typeof document !== 'undefined') {
  StyleSheet.setFlag?.('darkMode', 'class');
}