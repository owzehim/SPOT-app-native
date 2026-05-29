// app/signup.jsx
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
import { supabase } from '@/lib/supabase';
import { COUNTRIES } from '@/constants/countries';
import { useI18n } from '@/i18n/LanguageContext';

// TOTP secret 생성 (Base32 스타일)
function generateTotpSecret(length = 32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    secret += alphabet[idx];
  }
  return secret;
}

export default function SignupPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();

  // Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [major, setMajor] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');

  // 학위/학년 버튼 (회원가입/어드민과 동일 구조)
  const [degreeLevel, setDegreeLevel] = useState(null); // 'bachelor' | 'master'
  const [studyYear, setStudyYear] = useState(null); // '1'|'2'|'3'|'4+'

  const [showCountryList, setShowCountryList] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const degreeOptions = [
    { value: 'bachelor', label: 'Bachelor' },
    { value: 'master', label: 'Master' },
  ];

  const studyYearOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4+', label: '4+' },
  ];

  const genderOptions = [
    { value: 'male', label: t('signup.genderMale') },
    { value: 'female', label: t('signup.genderFemale') },
    { value: 'non_binary', label: t('signup.genderNonBinary') },
    { value: 'prefer_not_to_say', label: t('signup.genderPreferNot') },
  ];

  const composeYearLabel = (degree, year) => {
    if (!degree || !year) return null;
    const degreeLabel = degree === 'bachelor' ? 'Bachelor' : 'Master';
    return `${degreeLabel} ${year}`; // "Bachelor 1"
  };

  const handleSignup = async () => {
    setError('');

    if (!email || !password) {
      setError(t('signup.errorMissingAuth'));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t('signup.errorPasswordMismatch'));
      return;
    }
    if (!firstName || !lastName || !studentNumber || !major) {
      setError(t('signup.errorMissingProfile'));
      return;
    }

    setLoading(true);
    try {
      // 1) Supabase Auth 계정 생성
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(
          signUpError.message || t('signup.errorSignupFailed'),
        );
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setError(t('signup.errorSignupFailed'));
        setLoading(false);
        return;
      }

      // 2) year label + totp secret 생성
      const yearLabel = composeYearLabel(degreeLevel, studyYear);
      const totpSecret = generateTotpSecret();
      const yearOfBirthInt = yearOfBirth
        ? parseInt(yearOfBirth, 10)
        : null;

      // 3) members 프로필 레코드 생성
      const { error: profileError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          University: 'University of Amsterdam',
          student_number: studentNumber,
          major,
          year: yearLabel,
          year_of_birth: yearOfBirthInt,
          country_of_origin: countryOfOrigin || null,
          gender,
          totp_secret: totpSecret,
          is_member: false,
          membership_valid_until: null,
        });

      if (profileError) {
        setError(
          profileError.message || t('signup.errorProfileSave'),
        );
        setLoading(false);
        return;
      }

      // 4) 멤버 페이지로 이동
      router.replace('/member');
    } catch (err) {
      console.error(err);
      setError(t('signup.errorUnknown'));
    } finally {
      setLoading(false);
    }
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
            padding: 24,
            width: '100%',
            maxWidth: 448,
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
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={require('../assets/uvain-logo.png')}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
          </View>

          {/* 타이틀 */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text
              style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}
            >
              {t('signup.title')}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#6b7280',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {t('signup.subtitle')}
            </Text>
          </View>

          {/* 이메일 / 비밀번호 */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              {t('signup.emailLabel')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@student.uva.nl"
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

          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              {t('signup.passwordLabel')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
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

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              {t('signup.passwordConfirmLabel')}
            </Text>
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="••••••••"
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

          {/* 구분선 + 기본 정보 헤더 */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
              paddingTop: 16,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: 8,
              }}
            >
              {t('signup.basicInfo')}
            </Text>

            {/* 이름 */}
            <View
              style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: 4,
                  }}
                >
                  {t('signup.firstName')}
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="길동 / John"
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
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: 4,
                  }}
                >
                  {t('signup.lastName')}
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="홍 / Doe"
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
            </View>

            {/* 학번 / 전공 */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {t('signup.studentNumber')}
              </Text>
              <TextInput
                value={studentNumber}
                onChangeText={setStudentNumber}
                placeholder="예: 12345678"
                keyboardType="numeric"
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

            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {t('signup.major')}
              </Text>
              <TextInput
                value={major}
                onChangeText={setMajor}
                placeholder="예: Economics"
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

            {/* 학위 / 학년 선택 */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {t('signup.degreeAndYear')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 6,
                }}
              >
                {degreeOptions.map((opt) => {
                  const active = degreeLevel === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setDegreeLevel(opt.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? '#f97316' : '#e5e7eb',
                        backgroundColor: active ? '#fff7ed' : 'white',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: active ? '#c2410c' : '#374151',
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {studyYearOptions.map((opt) => {
                  const active = studyYear === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setStudyYear(opt.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? '#f97316' : '#e5e7eb',
                        backgroundColor: active ? '#fff7ed' : 'white',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: active ? '#c2410c' : '#374151',
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 출생연도 */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {t('signup.yearOfBirth')}
              </Text>
              <TextInput
                value={yearOfBirth}
                onChangeText={setYearOfBirth}
                placeholder="예: 2002"
                keyboardType='numeric'
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

            {/* 출신 국가 */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {t('signup.countryOfOrigin')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCountryList((v) => !v)}
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  justifyContent: 'space-between',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: countryOfOrigin ? '#111827' : '#9ca3af',
                  }}
                >
                  {countryOfOrigin ||
                    t('signup.countryPlaceholder')}
                </Text>
                <Text style={{ color: '#9ca3af' }}>
                  {showCountryList ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showCountryList && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    marginTop: 6,
                    maxHeight: 200,
                    overflow: 'hidden',
                  }}
                >
                  <ScrollView>
                    {COUNTRIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => {
                          setCountryOfOrigin(c);
                          setShowCountryList(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor:
                            c === countryOfOrigin
                              ? '#f97316'
                              : 'white',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color:
                              c === countryOfOrigin
                                ? 'white'
                                : '#111827',
                          }}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 성별 */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {t('signup.gender')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {genderOptions.map((opt) => {
                  const isActive = gender === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setGender(opt.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isActive
                          ? '#f97316'
                          : '#e5e7eb',
                        backgroundColor: isActive
                          ? '#fff7ed'
                          : 'white',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: isActive ? '#c2410c' : '#374151',
                          fontWeight: isActive ? '600' : '400',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 에러 메시지 */}
          {error ? (
            <Text
              style={{
                color: '#ef4444',
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* 제출 버튼 */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#fdba74' : '#f97316',
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
              marginTop: 4,
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
                ? t('signup.signingUp')
                : t('signup.signupButton')}
            </Text>
          </TouchableOpacity>

          {/* 로그인으로 돌아가기 */}
          <TouchableOpacity
            onPress={() => router.replace('/login')}
            style={{
              marginTop: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, color: '#6b7280' }}>
              {t('signup.alreadyHaveAccountPrefix')}{' '}
              <Text
                style={{ color: '#f97316', fontWeight: '500' }}
              >
                {t('signup.alreadyHaveAccountAction')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}