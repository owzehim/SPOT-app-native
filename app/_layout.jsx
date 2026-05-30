// app/_layout.jsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../src/lib/supabase';
import '../global.css';
import { I18nProvider } from '@/i18n/LanguageContext';

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