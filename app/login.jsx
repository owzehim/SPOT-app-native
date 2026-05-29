import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'phosphor-react-native';
import { supabase } from '../src/lib/supabase';
import { useI18n } from '@/i18n/LanguageContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
const { t, language, setLanguage } = useI18n();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{
          backgroundColor: 'white', borderRadius: 16, padding: 32,
          width: '100%', maxWidth: 384,
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
          borderWidth: 1, borderColor: '#f3f4f6'
        }}>

          {/* Close button */}
          <TouchableOpacity
            onPress={() => router.replace('/public')}
            style={{ alignSelf: 'flex-end', marginBottom: 16 }}
          >
            <X size={24} weight="bold" color="#9ca3af" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Image
              source={require('../assets/uvain-logo.png')}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>UvA-IN</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              University of Amsterdam 한국인 학생회
            </Text>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
              이메일
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@student.uva.nl"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8, fontSize: 14
              }}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
              비밀번호
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              style={{
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8, fontSize: 14
              }}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>{error}</Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#fdba74' : '#f97316',
              borderRadius: 8, paddingVertical: 10, alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
              {loading ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>

{/* Signup link */}
<TouchableOpacity
  onPress={() => router.replace('/signup')}
  style={{ marginTop: 12, alignItems: 'center' }}
>
  <Text style={{ fontSize: 13, color: '#6b7280' }}>
    처음이신가요?{' '}
    <Text style={{ color: '#f97316', fontWeight: '500' }}>
      회원가입
    </Text>
  </Text>
</TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
