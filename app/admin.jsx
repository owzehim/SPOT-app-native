import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Eye, EyeSlash } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { useEventForm } from '@/admin/useEventForm';
import EventsEditor from '@/admin/EventsEditor';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import RestaurantsEditor from '@/admin/RestaurantsEditor';
import { COUNTRIES } from '@/constants/countries';

// ─── Helpers ────────────────────────────────────────────────────────────────
function toLocalDateString(isoString) {
  if (!isoString) return '';
  return String(isoString).slice(0, 10);
}

function toLocalTimeString(isoString) {
  if (!isoString) return '';
  const s = String(isoString);
  if (s.includes('+') || s.endsWith('Z')) {
    const d = new Date(s);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return s.length >= 16 ? s.slice(11, 16) : '';
}

function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const time = timeStr || '00:00';
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0).toISOString();
}

function koreanSort(arr, key) {
  return [...arr].sort((a, b) => (a[key] || '').localeCompare(b[key] || '', ['ko', 'en']));
}

// ─── Reusable Field ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, multiline, keyboardType, secureTextEntry }) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          color: '#111827',
        }}
      />
    </View>
  );
}
 
// ─── AdminPage Shell ────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data } = await supabase.from('admin_roles').select('id').eq('user_id', user.id).single();
      if (!data) {
        router.replace('/member');
        return;
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#6b7280' }}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.replace('/member')}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>← 내 QR</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>관리자 패널</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row' }}>
        {[
          { key: 'members', label: '멤버 관리' },
          { key: 'events', label: '이벤트' },
          { key: 'restaurants', label: '장소' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === key ? '#2563eb' : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: activeTab === key ? '#2563eb' : '#6b7280' }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'restaurants' && <RestaurantsTab />}
      </View>
    </SafeAreaView>
  );
}

// ─── Members Tab ────────────────────────────────────────────────────────────
function MembersTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    student_number: '',
    major: '',
    year: '',
    year_of_birth: '',
    country_of_origin: '',
    gender: 'prefer_not_to_say',
    is_member: true,
    membership_valid_until: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // 학위/학년 버튼 상태 (회원가입과 동일한 구조)
  const [degreeLevel, setDegreeLevel] = useState(null); // 'bachelor' | 'master' | null
  const [studyYear, setStudyYear] = useState(null);     // '1'|'2'|'3'|'4+'|null

  // 출신 국가 드롭다운
  const [showCountryList, setShowCountryList] = useState(false);

  const GENDER_OPTIONS = [
    { value: 'male', label: '남성' },
    { value: 'female', label: '여성' },
    { value: 'non_binary', label: '논바이너리' },
    { value: 'prefer_not_to_say', label: '응답하지 않음' },
  ];

  const DEGREE_OPTIONS = [
    { value: 'bachelor', label: 'Bachelor' },
    { value: 'master', label: 'Master' },
  ];

  const STUDY_YEAR_OPTIONS = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4+', label: '4+' },
  ];

  const generateSecret = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  };

  const composeYearLabel = (degree, year) => {
    if (!degree || !year) return null;
    const degreeLabel = degree === 'bachelor' ? 'Bachelor' : 'Master';
    return `${degreeLabel} ${year}`; // 예: "Bachelor 1"
  };

  const parseYearLabel = (label) => {
    if (!label) return { degree: null, year: null };
    const lower = String(label).toLowerCase();
    let degree = null;
    if (lower.includes('bachelor')) degree = 'bachelor';
    if (lower.includes('master')) degree = 'master';

    const match = label.match(/(\d\+?)/);
    const year = match ? match[1] : null;

    return { degree, year };
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAdd = async () => {
    if (
      !form.email ||
      !form.password ||
      !form.first_name ||
      !form.last_name ||
      !form.student_number ||
      !form.major
    ) {
      Alert.alert('오류', '이메일, 비밀번호, 이름, 학번, 전공은 필수입니다.');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      Alert.alert('오류', authError.message);
      return;
    }

    const totpSecret = generateSecret();
    const yearOfBirthInt = form.year_of_birth
      ? parseInt(form.year_of_birth, 10)
      : null;

    const yearLabel = composeYearLabel(degreeLevel, studyYear);

    const { error: memberError } = await supabase.from('members').insert({
      user_id: authData.user?.id,
      first_name: form.first_name,
      last_name: form.last_name,
      student_number: form.student_number,
      major: form.major,
      year: yearLabel, // 버튼에서 만들어진 값
      year_of_birth: yearOfBirthInt,
      country_of_origin: form.country_of_origin || null,
      gender: form.gender || 'prefer_not_to_say',
      is_member: form.is_member,
      membership_valid_until: form.membership_valid_until || null,
      totp_secret: totpSecret,
    });

    if (memberError) {
      Alert.alert('오류', memberError.message);
      return;
    }

    Alert.alert(
      '완료',
      `계정 생성 완료!\n이메일: ${form.email}\n비밀번호: ${form.password}`,
    );
    resetFormState();
    fetchMembers();
  };

  const handleEdit = async () => {
    const yearOfBirthInt = form.year_of_birth
      ? parseInt(form.year_of_birth, 10)
      : null;

    const yearLabel =
      degreeLevel && studyYear
        ? composeYearLabel(degreeLevel, studyYear)
        : form.year || null;

    const { error } = await supabase
      .from('members')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        student_number: form.student_number,
        major: form.major,
        year: yearLabel,
        year_of_birth: yearOfBirthInt,
        country_of_origin: form.country_of_origin || null,
        gender: form.gender || 'prefer_not_to_say',
        is_member: form.is_member,
        membership_valid_until: form.membership_valid_until || null,
      })
      .eq('id', editTarget.id);

    if (error) {
      Alert.alert('오류', error.message);
      return;
    }

    Alert.alert('완료', '수정 완료');
    resetFormState();
    fetchMembers();
  };

  const handleDelete = (id) => {
    Alert.alert('삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('members').delete().eq('id', id);
          fetchMembers();
        },
      },
    ]);
  };

  const resetFormState = () => {
    setShowForm(false);
    setEditTarget(null);
    setForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      student_number: '',
      major: '',
      year: '',
      year_of_birth: '',
      country_of_origin: '',
      gender: 'prefer_not_to_say',
      is_member: true,
      membership_valid_until: '',
    });
    setDegreeLevel(null);
    setStudyYear(null);
    setShowCountryList(false);
    setShowPassword(false);
  };

  const openAdd = () => {
    resetFormState();
    setShowForm(true);
  };

  const openEdit = (member) => {
    const { degree, year } = parseYearLabel(member.year);

    setEditTarget(member);
    setForm({
      email: '',
      password: '',
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      student_number: member.student_number || '',
      major: member.major || '',
      year: member.year || '',
      year_of_birth:
        member.year_of_birth != null ? String(member.year_of_birth) : '',
      country_of_origin: member.country_of_origin || '',
      gender: member.gender || 'prefer_not_to_say',
      is_member: !!member.is_member,
      membership_valid_until: member.membership_valid_until || '',
    });
    setDegreeLevel(degree);
    setStudyYear(year);
    setShowForm(true);
  };

  const sorted = koreanSort(members, 'last_name');

  const genderLabel = (value) => {
    const opt = GENDER_OPTIONS.find((o) => o.value === value);
    return opt ? opt.label : '';
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontWeight: '600', color: '#111827' }}>
          멤버 목록 ({members.length}명)
        </Text>
        {!showForm && (
          <TouchableOpacity
            onPress={openAdd}
            style={{
              backgroundColor: '#2563eb',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={14} weight="bold" color="white" />
            <Text
              style={{ color: 'white', fontSize: 13, fontWeight: '500' }}
            >
              멤버 추가
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 폼 */}
      {showForm && (
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: '600', color: '#111827' }}>
            {editTarget ? '멤버 수정' : '새 멤버 추가'}
          </Text>

          {/* 신규 계정일 때만 이메일/비밀번호 */}
          {!editTarget && (
            <>
              <Field
                label="이메일 *"
                value={form.email}
                onChange={(v) =>
                  setForm((f) => ({ ...f, email: v }))
                }
                placeholder="member@example.com"
                keyboardType="email-address"
              />
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginBottom: 4,
                  }}
                >
                  비밀번호 *
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <TextInput
                    value={form.password}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, password: v }))
                    }
                    placeholder="최소 8자"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: '#111827',
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlash size={16} color="#6b7280" />
                    ) : (
                      <Eye size={16} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* 이름 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="First Name *"
                value={form.first_name}
                onChange={(v) =>
                  setForm((f) => ({ ...f, first_name: v }))
                }
                placeholder="John"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Last Name *"
                value={form.last_name}
                onChange={(v) =>
                  setForm((f) => ({ ...f, last_name: v }))
                }
                placeholder="Doe"
              />
            </View>
          </View>

          {/* 학번 / 전공 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="학번 *"
                value={form.student_number}
                onChange={(v) =>
                  setForm((f) => ({ ...f, student_number: v }))
                }
                placeholder="2024001"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="전공 *"
                value={form.major}
                onChange={(v) =>
                  setForm((f) => ({ ...f, major: v }))
                }
                placeholder="Economics"
              />
            </View>
          </View>

          {/* 학위 / 학년 버튼 (회원가입과 동일) */}
          <View>
            <Text
              style={{
                fontSize: 12,
                color: '#6b7280',
                marginBottom: 4,
              }}
            >
              학위 과정 / 학년
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              {DEGREE_OPTIONS.map((opt) => {
                const active = degreeLevel === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setDegreeLevel(opt.value);
                      const label = composeYearLabel(
                        opt.value,
                        studyYear,
                      );
                      setForm((f) => ({ ...f, year: label || '' }));
                    }}
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STUDY_YEAR_OPTIONS.map((opt) => {
                const active = studyYear === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setStudyYear(opt.value);
                      const label = composeYearLabel(
                        degreeLevel,
                        opt.value,
                      );
                      setForm((f) => ({ ...f, year: label || '' }));
                    }}
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
            {form.year ? (
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                저장될 값: {form.year}
              </Text>
            ) : null}
          </View>

          {/* 출생연도 */}
          <Field
            label="출생연도"
            value={form.year_of_birth}
            onChange={(v) =>
              setForm((f) => ({ ...f, year_of_birth: v }))
            }
            placeholder="예: 2002"
            keyboardType="numeric"
          />

          {/* 출신 국가 - 리스트 선택 */}
          <View>
            <Text
              style={{
                fontSize: 12,
                color: '#6b7280',
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
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: form.country_of_origin
                    ? '#111827'
                    : '#9ca3af',
                }}
              >
                {form.country_of_origin || '선택해 주세요'}
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
                        setForm((f) => ({
                          ...f,
                          country_of_origin: c,
                        }));
                        setShowCountryList(false);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor:
                          c === form.country_of_origin
                            ? '#f97316'
                            : 'white',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color:
                            c === form.country_of_origin
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
          <View>
            <Text
              style={{
                fontSize: 12,
                color: '#6b7280',
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
                const active = form.gender === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() =>
                      setForm((f) => ({ ...f, gender: opt.value }))
                    }
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

          {/* 멤버십 상태 / 유효기간 */}
          <View style={{ marginTop: 8, gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text
                style={{ fontSize: 12, color: '#6b7280' }}
              >
                멤버십 상태
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setForm((f) => ({
                    ...f,
                    is_member: !f.is_member,
                  }))
                }
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: form.is_member
                    ? '#dcfce7'
                    : '#f3f4f6',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: form.is_member
                      ? '#15803d'
                      : '#6b7280',
                    fontWeight: '500',
                  }}
                >
                  {form.is_member ? '활성' : '비활성'}
                </Text>
              </TouchableOpacity>
            </View>

            <Field
              label="유효기간 (YYYY-MM-DD)"
              value={form.membership_valid_until}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  membership_valid_until: v,
                }))
              }
              placeholder="2025-08-31"
            />
          </View>

          {/* 저장/취소 */}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 8,
            }}
          >
            <TouchableOpacity
              onPress={editTarget ? handleEdit : handleAdd}
              style={{
                flex: 1,
                backgroundColor: '#2563eb',
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                {editTarget ? '수정 완료' : '멤버 추가'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetFormState}
              style={{
                flex: 1,
                backgroundColor: '#f3f4f6',
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{ color: '#4b5563', fontSize: 14 }}
              >
                취소
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 리스트 */}
      {loading ? (
        <Text style={{ color: '#6b7280' }}>로딩 중...</Text>
      ) : (
        sorted.map((member) => (
          <View
            key={member.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#f3f4f6',
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '600',
                    color: '#111827',
                    fontSize: 14,
                  }}
                >
                  {member.first_name} {member.last_name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 2,
                  }}
                >
                  {member.student_number} · {member.major}
                  {member.year ? ` · ${member.year}` : ''}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 2,
                  }}
                >
                  {member.year_of_birth
                    ? `출생연도: ${member.year_of_birth}`
                    : ''}
                  {member.country_of_origin
                    ? (member.year_of_birth ? ' · ' : '') +
                      member.country_of_origin
                    : ''}
                  {member.gender
                    ? ` · ${genderLabel(member.gender)}`
                    : ''}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    marginTop: 2,
                  }}
                >
                  유효기간:{' '}
                  {member.membership_valid_until || '없음'}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: member.is_member
                      ? '#dcfce7'
                      : '#f3f4f6',
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: member.is_member
                        ? '#15803d'
                        : '#6b7280',
                    }}
                  >
                    {member.is_member ? '활성' : '비활성'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEdit(member)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#2563eb',
                    }}
                  >
                    수정
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(member.id)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#ef4444',
                    }}
                  >
                    삭제
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Events Tab (리팩터링 버전) ───────────────────────────────────────────────
function EventsTab() {
  const {
    events,
    archivedEvents,
    showForm,
    showArchived,
    form,
    setForm,
    imageUrls,
    setImageUrls,
    uploading,
    editTarget,
    setShowArchived,
    openAdd,
    openEdit,
    resetForm,
    handleSave,
    handleDelete,
    handleArchive,
    handleRestore,
  } = useEventForm();

  const groupByMonth = (arr) => {
    const grouped = {};
    arr.forEach((ev) => {
      const label = ev.event_date
        ? `${new Date(ev.event_date).getMonth() + 1}월`
        : '날짜 미정';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(ev);
    });
    return grouped;
  };

  const renderEventCard = (ev, isArchived = false) => (
    <View
      key={ev.id}
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        padding: 16,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>
            {ev.title}
          </Text>
          {ev.location ? (
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {ev.location.replace(/<[^>]+>/g, '')}
            </Text>
          ) : null}
          {ev.event_date ? (
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              {new Date(ev.event_date).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isArchived ? (
            <>
              <TouchableOpacity onPress={() => handleRestore(ev.id)}>
                <Text style={{ fontSize: 12, color: '#16a34a' }}>복원</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(ev)}>
                <Text style={{ fontSize: 12, color: '#2563eb' }}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(ev.id)}>
                <Text style={{ fontSize: 12, color: '#ef4444' }}>삭제</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => handleArchive(ev.id)}>
                <Text style={{ fontSize: 12, color: '#16a34a' }}>보관</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(ev)}>
                <Text style={{ fontSize: 12, color: '#2563eb' }}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(ev.id)}>
                <Text style={{ fontSize: 12, color: '#ef4444' }}>삭제</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* 헤더 + 버튼들 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: '600', color: '#111827' }}>이벤트 관리</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={{
              backgroundColor: '#16a34a',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              {showArchived ? '← 목록' : '보관된 이벤트'}
            </Text>
          </TouchableOpacity>
          {!showForm && !showArchived && (
            <TouchableOpacity
              onPress={openAdd}
              style={{
                backgroundColor: '#2563eb',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={14} weight="bold" color="white" />
              <Text
                style={{
                  color: 'white',
                  fontSize: 12,
                  fontWeight: '500',
                }}
              >
                이벤트 추가
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 편집 폼 (웹/네이티브 공통 shell + 플랫폼별 Editor) */}
      {showForm && (
        <EventsEditor
          form={form}
          setForm={setForm}
          imageUrls={imageUrls}
          setImageUrls={setImageUrls}
          uploading={uploading}
          editTarget={editTarget}
          onSave={handleSave}
          onCancel={resetForm}
        />
      )}

      {/* 목록/보관 목록 */}
      {showArchived ? (
        <View>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#9ca3af',
              marginBottom: 8,
            }}
          >
            보관된 이벤트 ({archivedEvents.length})
          </Text>
          {archivedEvents.length === 0 ? (
            <Text style={{ color: '#6b7280', fontSize: 14 }}>
              보관된 이벤트가 없어요.
            </Text>
          ) : (
            Object.entries(groupByMonth(archivedEvents)).map(([month, evs]) => (
              <View key={month} style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#9ca3af',
                    marginBottom: 4,
                  }}
                >
                  {month}
                </Text>
                {evs.map((ev) => renderEventCard(ev, true))}
              </View>
            ))
          )}
        </View>
      ) : (
        <View>
          {events.length === 0 ? (
            <Text style={{ color: '#6b7280', fontSize: 14 }}>
              이벤트가 없어요.
            </Text>
          ) : (
            Object.entries(groupByMonth(events)).map(([month, evs]) => (
              <View key={month} style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#9ca3af',
                    marginBottom: 4,
                  }}
                >
                  {month}
                </Text>
                {evs.map((ev) => renderEventCard(ev, false))}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Restaurants Tab ────────────────────────────────────────────────────────
// ─── Restaurants Tab ────────────────────────────────────────────────────────
const SPOT_CATEGORIES = [
  '맛집',
  '카페',
  '마트',
  '스터디',
  '학교',
  '의료',
  '운동',
  '미용/뷰티',
  '여가',
  '쇼핑',
  '기타',
];

function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    map_label: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    discount_info: '',
    discount_terms: '',
    rating: '',
    review: '',
    reviewer_name: '',
    category: '맛집',
    price_range: '',
    is_sponsored: false,
    image_urls: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [pendingReplacements, setPendingReplacements] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });
    setRestaurants(data || []);
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // ── 이미지 선택 (네이티브용) ────────────────────────────────────────────────
  const handleAddImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultiple: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      for (const asset of result.assets) {
        setImagePreviews((prev) => [
          ...prev,
          { uri: asset.uri, name: asset.fileName || 'image.jpg' },
        ]);
      }
    }
  };

  const handleCropImage = async (idx, isExisting = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (isExisting) {
        setPendingReplacements((prev) => [
          ...prev.filter((p) => p.idx !== idx),
          {
            idx,
            file: { uri: asset.uri, name: asset.fileName || 'image.jpg' },
            previewUrl: asset.uri,
          },
        ]);
      } else {
        setImagePreviews((prev) => {
          const next = [...prev];
          next[idx] = { uri: asset.uri, name: asset.fileName || 'image.jpg' };
          return next;
        });
      }
    }
  };

  const handleRemoveImage = (idx, isExisting = false) => {
    if (isExisting) {
      setForm((prev) => ({
        ...prev,
        image_urls: prev.image_urls.filter((_, i) => i !== idx),
      }));
      setPendingReplacements((prev) => prev.filter((p) => p.idx !== idx));
    } else {
      setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setForm({
      name: '',
      map_label: '',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      discount_info: '',
      discount_terms: '',
      rating: '',
      review: '',
      reviewer_name: '',
      category: '맛집',
      price_range: '',
      is_sponsored: false,
      image_urls: [],
    });
    setImagePreviews([]);
    setPendingReplacements([]);
  };

  // ── RN 이미지 업로드 helper (uri → Supabase Storage) ─────────────────────
  const uploadFromUri = async (uri, name) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const ext = (name && name.split('.').pop()) || 'jpg';
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('place-images')
      .upload(fileName, blob);

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from('place-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // ── 저장: 웹/네이티브 둘 다 여기로 ────────────────────────────────────────
  const handleSave = async (override) => {
    if (!form.name) {
      Alert.alert('오류', '장소 이름을 입력해주세요.');
      return;
    }

    setUploading(true);

    try {
      let image_urls = [];

      // 1) 웹 에디터에서 최종 URL 배열을 넘겨준 경우
      if (override && override.imageUrls && override.imageUrls.length > 0) {
        image_urls = override.imageUrls;
      } else {
        // 2) 네이티브: 기존 로직

        // 먼저 기존 이미지 배열 복사
        image_urls = [...(form.image_urls || [])];

        // 기존 이미지 중 교체 대상 처리
        for (const { idx, file } of pendingReplacements) {
          const oldUrl = image_urls[idx];
          const oldName = oldUrl ? oldUrl.split('/').pop() : null;
          if (oldName) {
            await supabase.storage
              .from('place-images')
              .remove([oldName]);
          }

          const newUrl = await uploadFromUri(file.uri, file.name);
          image_urls[idx] = newUrl;
        }

        // 새로 추가된 이미지 업로드
        for (const preview of imagePreviews) {
          if (!preview.uri) continue;
          const newUrl = await uploadFromUri(preview.uri, preview.name);
          image_urls.push(newUrl);
        }
      }

      const payload = {
        name: form.name,
        map_label: form.map_label,
        description: form.description,
        address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        discount_info: form.discount_info,
        discount_terms: form.discount_terms,
        rating: form.rating ? parseFloat(form.rating) : 0,
        review: form.review,
        reviewer_name: form.reviewer_name,
        category: form.category,
        price_range: form.price_range,
        is_sponsored: form.is_sponsored,
        image_urls,
      };

      if (editTarget) {
        const { error } = await supabase
          .from('restaurants')
          .update(payload)
          .eq('id', editTarget.id);
        if (error) {
          Alert.alert('오류', error.message);
          setUploading(false);
          return;
        }
      } else {
        const { error } = await supabase.from('restaurants').insert(payload);
        if (error) {
          Alert.alert('오류', error.message);
          setUploading(false);
          return;
        }
      }

      resetForm();
      fetchRestaurants();
    } catch (e) {
      Alert.alert(
        '오류',
        e && e.message ? e.message : '저장 중 오류가 발생했습니다.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('삭제', '삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('restaurants').delete().eq('id', id);
          fetchRestaurants();
        },
      },
    ]);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({
      name: '',
      map_label: '',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      discount_info: '',
      discount_terms: '',
      rating: '',
      review: '',
      reviewer_name: '',
      category: '맛집',
      price_range: '',
      is_sponsored: false,
      image_urls: [],
    });
    setImagePreviews([]);
    setPendingReplacements([]);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditTarget(r);
    setForm({
      name: r.name || '',
      map_label: r.map_label || '',
      description: r.description || '',
      address: r.address || '',
      latitude: r.latitude != null ? String(r.latitude) : '',
      longitude: r.longitude != null ? String(r.longitude) : '',
      discount_info: r.discount_info || '',
      discount_terms: r.discount_terms || '',
      rating: r.rating != null ? String(r.rating) : '',
      review: r.review || '',
      reviewer_name: r.reviewer_name || '',
      category: r.category || '맛집',
      price_range: r.price_range || '',
      is_sponsored: !!r.is_sponsored,
      image_urls: r.image_urls || [],
    });
    setImagePreviews([]);
    setPendingReplacements([]);
    setShowForm(true);
  };

  const sorted = koreanSort(restaurants, 'name');
  const grouped = {};
  sorted.forEach((r) => {
    const key = r.category || '기타';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* 헤더 + 버튼 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontWeight: '600', color: '#111827' }}>장소 관리</Text>
        {!showForm && (
          <TouchableOpacity
            onPress={openAdd}
            style={{
              backgroundColor: '#2563eb',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={14} weight="bold" color="white" />
            <Text
              style={{ color: 'white', fontSize: 13, fontWeight: '500' }}
            >
              장소 추가
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 편집 폼 (웹/네이티브 공통) */}
      {showForm && (
        <RestaurantsEditor
          form={form}
          setForm={setForm}
          editTarget={editTarget}
          uploading={uploading}
          imagePreviews={imagePreviews}
          setImagePreviews={setImagePreviews}
          pendingReplacements={pendingReplacements}
          setPendingReplacements={setPendingReplacements}
          handleAddImage={handleAddImage}
          handleCropImage={handleCropImage}
          handleRemoveImage={handleRemoveImage}
          handleSave={handleSave}
          resetForm={resetForm}
        />
      )}

      {/* 목록 */}
      {restaurants.length === 0 ? (
        <Text style={{ color: '#6b7280', fontSize: 14 }}>
          등록된 장소가 없어요.
        </Text>
      ) : (
        Object.entries(grouped).map(([cat, places]) => (
          <View key={cat}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#9ca3af',
                textTransform: 'uppercase',
                paddingTop: 8,
                marginBottom: 8,
              }}
            >
              {cat} ({places.length})
            </Text>
            {places.map((r) => (
              <View
                key={r.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#f3f4f6',
                  padding: 16,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '600',
                          color: '#111827',
                          fontSize: 14,
                        }}
                      >
                        {r.name}
                      </Text>
                      {r.is_sponsored && (
                        <View
                          style={{
                            backgroundColor: '#fff7ed',
                            borderRadius: 999,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              color: '#ea580c',
                            }}
                          >
                            제휴
                          </Text>
                        </View>
                      )}
                    </View>
                    {r.address ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#6b7280',
                          marginTop: 2,
                        }}
                      >
                        {r.address}
                      </Text>
                    ) : null}
                    {r.discount_info ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#f97316',
                          marginTop: 2,
                        }}
                      >
                        {r.discount_info.replace(/<[^>]+>/g, '')}
                      </Text>
                    ) : null}
                    {r.rating > 0 ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#f59e0b',
                          marginTop: 2,
                        }}
                      >
                        ★ {r.rating}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}
                  >
                    <TouchableOpacity onPress={() => openEdit(r)}>
                      <Text
                        style={{ fontSize: 12, color: '#2563eb' }}
                      >
                        수정
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(r.id)}
                    >
                      <Text
                        style={{ fontSize: 12, color: '#ef4444' }}
                      >
                        삭제
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}