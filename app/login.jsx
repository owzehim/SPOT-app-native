// app/login.jsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 항상 동일 메시지로 처리 (보안 + UX)
      setError(t('login.errorInvalid'));
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 384,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}
        >
          {/* 상단: 닫기 / 언어 토글 */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => router.replace('/public')}
              style={{ padding: 4 }}
            >
              <X size={24} weight="bold" color="#9ca3af" />
            </TouchableOpacity>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <TouchableOpacity onPress={() => setLanguage('ko')}>
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      language === 'ko' ? '#111827' : '#9ca3af',
                    fontWeight: language === 'ko' ? '600' : '400',
                  }}
                >
                  한국어
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: '#d1d5db' }}>|</Text>
              <TouchableOpacity onPress={() => setLanguage('en')}>
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      language === 'en' ? '#111827' : '#9ca3af',
                    fontWeight: language === 'en' ? '600' : '400',
                  }}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 로고 */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image
              source={require('../assets/uvain-logo.png')}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#111827',
              }}
            >
              {t('common.appName')}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#6b7280',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {t('login.subtitle')}
            </Text>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              {t('login.emailLabel')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 14,
              }}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              {t('login.passwordLabel')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('login.passwordPlaceholder')}
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 14,
              }}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text
              style={{
                color: '#ef4444',
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#fdba74' : '#f97316',
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 14,
                fontWeight: '500',
              }}
            >
              {loading
                ? t('login.submitting')
                : t('login.submit')}
            </Text>
          </TouchableOpacity>

          {/* Signup link */}
          <TouchableOpacity
            onPress={() => router.replace('/signup')}
            style={{ marginTop: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, color: '#6b7280' }}>
              {t('login.signupLink')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}