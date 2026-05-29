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
import { supabase } from '../src/lib/supabase';
import { COUNTRIES } from '../src/constants/countries';

// 성별 옵션
const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'non_binary', label: '논바이너리' },
  { value: 'prefer_not_to_say', label: '응답하지 않음' },
];

// 학위 / 학년 옵션
const DEGREE_OPTIONS = [
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
];

const STUDY_YEAR_OPTIONS = [
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4+', label: 'Year 4+' },
];

// TOTP secret 생성 (간단한 Base32 스타일 문자열)
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
  const [degreeLevel, setDegreeLevel] = useState(null); // 'bachelor' | 'master'
  const [studyYear, setStudyYear] = useState(null); // '1'|'2'|'3'|'4+'

  const [showCountryList, setShowCountryList] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');

    // 간단 검증
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!firstName || !lastName || !studentNumber || !major) {
      setError('기본 프로필 정보를 모두 입력해 주세요.');
      return;
    }
    if (!degreeLevel || !studyYear) {
      setError('학위 과정과 학년을 선택해 주세요.');
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
        setError(signUpError.message || '회원가입 중 오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setError('회원가입에 실패했습니다. 다시 시도해 주세요.');
        setLoading(false);
        return;
      }

      // 2) 학위/학년을 year 필드에 사람이 읽기 좋은 형태로 저장
      const degreeLabel = degreeLevel === 'bachelor' ? 'Bachelor' : 'Master';
      const yearLabel = `${degreeLabel} ${studyYear}`; // 예: 'Bachelor 1'

      // 3) TOTP secret 생성
      const totpSecret = generateTotpSecret();

      const yearOfBirthInt = yearOfBirth
        ? parseInt(yearOfBirth, 10)
        : null;

      // 4) members 프로필 레코드 생성
      const { error: profileError } = await supabase.from('members').insert({
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
        totp_secret: totpSecret, // ★ NOT NULL 컬럼 채우기
        is_member: false, // 처음엔 멤버십 비활성
        membership_valid_until: null,
      });

      if (profileError) {
        setError(
          profileError.message ||
            '프로필 저장 중 오류가 발생했습니다. 임원에게 문의해 주세요.',
        );
        setLoading(false);
        return;
      }

      // 5) 멤버 페이지로 이동
      router.replace('/member');
    } catch (err) {
      console.error(err);
      setError('알 수 없는 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
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
          {/* Close */}
          <TouchableOpacity
            onPress={() => router.replace('/public')}
            style={{ alignSelf: 'flex-end', marginBottom: 16 }}
          >
            <X size={24} weight="bold" color="#9ca3af" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image
              source={require('../assets/uvain-logo.png')}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text
              style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}
            >
              UvA-IN 회원가입
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              첫 로그인 전에 간단한 프로필을 작성해 주세요.
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
              이메일
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
              비밀번호
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
              비밀번호 확인
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

          {/* 기본 프로필 */}
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
              기본 정보
            </Text>

            {/* 이름 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: 4,
                  }}
                >
                  이름
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="길동"
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
                  성
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="홍"
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
                학번
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
                전공
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
                학위 과정
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {DEGREE_OPTIONS.map((opt) => {
                  const isActive = degreeLevel === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setDegreeLevel(opt.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isActive ? '#f97316' : '#e5e7eb',
                        backgroundColor: isActive ? '#fff7ed' : 'white',
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

            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                학년
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {STUDY_YEAR_OPTIONS.map((opt) => {
                  const isActive = studyYear === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setStudyYear(opt.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isActive ? '#f97316' : '#e5e7eb',
                        backgroundColor: isActive ? '#fff7ed' : 'white',
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
                출생연도
              </Text>
              <TextInput
                value={yearOfBirth}
                onChangeText={setYearOfBirth}
                placeholder="예: 2002"
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

            {/* 출신 국가 - 선택 리스트 */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                출신 국가
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
                  {countryOfOrigin || '선택해 주세요'}
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
                            c === countryOfOrigin ? '#f97316' : 'white',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color:
                              c === countryOfOrigin ? 'white' : '#111827',
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
                성별
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {GENDER_OPTIONS.map((opt) => {
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
                        borderColor: isActive ? '#f97316' : '#e5e7eb',
                        backgroundColor: isActive ? '#fff7ed' : 'white',
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
              {loading ? '회원가입 중...' : '회원가입 완료하기'}
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
              이미 계정이 있으신가요?{' '}
              <Text style={{ color: '#f97316', fontWeight: '500' }}>
                로그인
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}