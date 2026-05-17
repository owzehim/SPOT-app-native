import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { supabase } from '../src/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Reusable Field ───────────────────────────────────────────────────────────
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
          borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          color: '#111827',
        }}
      />
    </View>
  );
}

// ─── AdminPage Shell ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data } = await supabase.from('admin_roles').select('id').eq('user_id', user.id).single();
      if (!data) { router.replace('/member'); return; }
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
      <View style={{
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
      }}>
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
            style={{
              flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === key ? '#2563eb' : 'transparent'
            }}
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

// ─── Members Tab ──────────────────────────────────────────────────────────────
function MembersTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '',
    student_number: '', major: '', is_member: true, membership_valid_until: ''
  });

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    return Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => chars[b % 32]).join('');
  };

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.first_name || !form.last_name || !form.student_number || !form.major) {
      Alert.alert('오류', '모든 필수 항목을 입력해주세요.'); return;
    }
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (authError) { Alert.alert('오류', authError.message); return; }
    const { error: memberError } = await supabase.from('members').insert({
      user_id: authData.user?.id,
      first_name: form.first_name, last_name: form.last_name,
      student_number: form.student_number, major: form.major,
      is_member: form.is_member,
      membership_valid_until: form.membership_valid_until || null,
      totp_secret: generateSecret()
    });
    if (memberError) { Alert.alert('오류', memberError.message); return; }
    Alert.alert('완료', `계정 생성 완료!\n이메일: ${form.email}\n비밀번호: ${form.password}`);
    setShowForm(false);
    setForm({ email: '', password: '', first_name: '', last_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' });
    fetchMembers();
  };

  const handleEdit = async () => {
    const { error } = await supabase.from('members').update({
      first_name: form.first_name, last_name: form.last_name,
      student_number: form.student_number, major: form.major,
      is_member: form.is_member,
      membership_valid_until: form.membership_valid_until || null
    }).eq('id', editTarget.id);
    if (error) { Alert.alert('오류', error.message); return; }
    Alert.alert('완료', '수정 완료');
    setEditTarget(null); setShowForm(false); fetchMembers();
  };

  const handleDelete = (id) => {
    Alert.alert('삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('members').delete().eq('id', id); fetchMembers(); } }
    ]);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ email: '', password: '', first_name: '', last_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' });
    setShowForm(true);
  };

  const openEdit = (member) => {
    setEditTarget(member);
    setForm({ email: '', password: '', first_name: member.first_name || '', last_name: member.last_name || '', student_number: member.student_number, major: member.major, is_member: member.is_member, membership_valid_until: member.membership_valid_until || '' });
    setShowForm(true);
  };

  const sorted = koreanSort(members, 'last_name');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '600', color: '#111827' }}>멤버 목록 ({members.length}명)</Text>
        {!showForm && (
          <TouchableOpacity onPress={openAdd} style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Plus size={14} weight="bold" color="white" />
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '500' }}>멤버 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 10 }}>
          <Text style={{ fontWeight: '600', color: '#111827' }}>{editTarget ? '멤버 수정' : '새 멤버 추가'}</Text>
          {!editTarget && (
            <>
              <Field label="이메일 *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="member@example.com" keyboardType="email-address" />
              <Field label="비밀번호 *" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="최소 8자" secureTextEntry />
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="First Name *" value={form.first_name} onChange={v => setForm(f => ({ ...f, first_name: v }))} placeholder="John" /></View>
            <View style={{ flex: 1 }}><Field label="Last Name *" value={form.last_name} onChange={v => setForm(f => ({ ...f, last_name: v }))} placeholder="Doe" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="학번 *" value={form.student_number} onChange={v => setForm(f => ({ ...f, student_number: v }))} placeholder="2024001" /></View>
            <View style={{ flex: 1 }}><Field label="전공 *" value={form.major} onChange={v => setForm(f => ({ ...f, major: v }))} placeholder="컴퓨터과학" /></View>
          </View>
          <Field label="유효기간 (YYYY-MM-DD)" value={form.membership_valid_until} onChange={v => setForm(f => ({ ...f, membership_valid_until: v }))} placeholder="2027-08-31" />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity onPress={editTarget ? handleEdit : handleAdd} style={{ flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{editTarget ? '수정 완료' : '멤버 추가'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowForm(false); setEditTarget(null); }} style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#4b5563', fontSize: 14 }}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? <Text style={{ color: '#6b7280' }}>로딩 중...</Text> : sorted.map(member => (
        <View key={member.id} style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{member.first_name} {member.last_name}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{member.student_number} · {member.major}</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>유효기간: {member.membership_valid_until || '없음'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: member.is_member ? '#dcfce7' : '#f3f4f6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: member.is_member ? '#15803d' : '#6b7280' }}>{member.is_member ? '활성' : '비활성'}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(member)}>
                <Text style={{ fontSize: 12, color: '#2563eb' }}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(member.id)}>
                <Text style={{ fontSize: 12, color: '#ef4444' }}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTab() {
  const [events, setEvents] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', eventDate: '', eventTime: '', location: '', instagram_url: ''
  });

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('is_archived', false).order('event_date', { ascending: true });
    setEvents(data || []);
  };

  const fetchArchived = async () => {
    const { data } = await supabase.from('events').select('*').eq('is_archived', true).order('event_date', { ascending: false });
    setArchivedEvents(data || []);
  };

  useEffect(() => { fetchEvents(); fetchArchived(); }, []);

  const handleSave = async () => {
    if (!form.title) { Alert.alert('오류', '제목을 입력해주세요.'); return; }
    const payload = {
      title: form.title,
      description: form.description,
      event_date: combineDateTime(form.eventDate, form.eventTime),
      location: form.location,
      instagram_url: form.instagram_url,
    };
    if (editTarget) {
      await supabase.from('events').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('events').insert(payload);
    }
    setShowForm(false); setEditTarget(null);
    setForm({ title: '', description: '', eventDate: '', eventTime: '', location: '', instagram_url: '' });
    fetchEvents(); fetchArchived();
  };

  const handleDelete = (id) => {
    Alert.alert('삭제', '삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('events').delete().eq('id', id); fetchEvents(); fetchArchived(); } }
    ]);
  };

  const handleArchive = async (id) => {
    await supabase.from('events').update({ is_archived: true }).eq('id', id);
    fetchEvents(); fetchArchived();
  };

  const handleRestore = async (id) => {
    await supabase.from('events').update({ is_archived: false }).eq('id', id);
    fetchEvents(); fetchArchived();
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ title: '', description: '', eventDate: '', eventTime: '', location: '', instagram_url: '' });
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditTarget(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      eventDate: toLocalDateString(ev.event_date),
      eventTime: toLocalTimeString(ev.event_date),
      location: ev.location || '',
      instagram_url: ev.instagram_url || ''
    });
    setShowForm(true);
  };

  const renderEventCard = (ev, isArchived = false) => (
    <View key={ev.id} style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{ev.title}</Text>
          {ev.location ? <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{ev.location.replace(/<[^>]+>/g, '')}</Text> : null}
          {ev.event_date ? <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{new Date(ev.event_date).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isArchived ? (
            <TouchableOpacity onPress={() => handleRestore(ev.id)}>
              <Text style={{ fontSize: 12, color: '#16a34a' }}>복원</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => handleArchive(ev.id)}>
              <Text style={{ fontSize: 12, color: '#16a34a' }}>보관</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => openEdit(ev)}>
            <Text style={{ fontSize: 12, color: '#2563eb' }}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(ev.id)}>
            <Text style={{ fontSize: 12, color: '#ef4444' }}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Text style={{ fontWeight: '600', color: '#111827' }}>이벤트 관리</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={{ backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>{showArchived ? '← 목록' : '보관된 이벤트'}</Text>
          </TouchableOpacity>
          {!showForm && !showArchived && (
            <TouchableOpacity onPress={openAdd} style={{ backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={14} weight="bold" color="white" />
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>이벤트 추가</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showForm && (
        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 10 }}>
          <Text style={{ fontWeight: '600', color: '#111827' }}>{editTarget ? '이벤트 수정' : '새 이벤트'}</Text>
          <Field label="제목 *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="이벤트 제목" />
          <Field label="내용" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="내용" multiline />
          <Field label="장소" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="장소" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="날짜 (YYYY-MM-DD)" value={form.eventDate} onChange={v => setForm(f => ({ ...f, eventDate: v }))} placeholder="2026-06-01" /></View>
            <View style={{ flex: 1 }}><Field label="시간 (HH:MM)" value={form.eventTime} onChange={v => setForm(f => ({ ...f, eventTime: v }))} placeholder="18:00" /></View>
          </View>
          <Field label="인스타그램 URL" value={form.instagram_url} onChange={v => setForm(f => ({ ...f, instagram_url: v }))} placeholder="https://instagram.com/..." />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity onPress={handleSave} style={{ flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{editTarget ? '수정 완료' : '추가'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowForm(false); setEditTarget(null); }} style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#4b5563', fontSize: 14 }}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showArchived ? (
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 8 }}>보관된 이벤트 ({archivedEvents.length})</Text>
          {archivedEvents.length === 0
            ? <Text style={{ color: '#6b7280', fontSize: 14 }}>보관된 이벤트가 없어요.</Text>
            : archivedEvents.map(ev => renderEventCard(ev, true))
          }
        </View>
      ) : (
        <View>
          {events.length === 0
            ? <Text style={{ color: '#6b7280', fontSize: 14 }}>이벤트가 없어요.</Text>
            : events.map(ev => renderEventCard(ev, false))
          }
        </View>
      )}
    </ScrollView>
  );
}

// ─── Restaurants Tab ──────────────────────────────────────────────────────────
const SPOT_CATEGORIES = ['맛집', '카페', '마트', '스터디', '학교', '의료', '운동', '미용/뷰티', '여가', '쇼핑', '기타'];

function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    name: '', map_label: '', description: '', address: '',
    latitude: '', longitude: '', discount_info: '', discount_terms: '',
    rating: '', review: '', reviewer_name: '',
    category: '맛집', price_range: '', is_sponsored: false
  });

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    setRestaurants(data || []);
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const resetForm = () => {
    setShowForm(false); setEditTarget(null);
    setForm({ name: '', map_label: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', discount_terms: '', rating: '', review: '', reviewer_name: '', category: '맛집', price_range: '', is_sponsored: false });
  };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('오류', '장소 이름을 입력해주세요.'); return; }
    const payload = {
      name: form.name, map_label: form.map_label, description: form.description,
      address: form.address,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      discount_info: form.discount_info, discount_terms: form.discount_terms,
      rating: form.rating ? parseFloat(form.rating) : 0,
      review: form.review, reviewer_name: form.reviewer_name,
      category: form.category, price_range: form.price_range,
      is_sponsored: form.is_sponsored,
    };
    if (editTarget) {
      const { error } = await supabase.from('restaurants').update(payload).eq('id', editTarget.id);
      if (error) { Alert.alert('오류', error.message); return; }
    } else {
      const { error } = await supabase.from('restaurants').insert(payload);
      if (error) { Alert.alert('오류', error.message); return; }
    }
    resetForm(); fetchRestaurants();
  };

  const handleDelete = (id) => {
    Alert.alert('삭제', '삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('restaurants').delete().eq('id', id); fetchRestaurants(); } }
    ]);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', map_label: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', discount_terms: '', rating: '', review: '', reviewer_name: '', category: '맛집', price_range: '', is_sponsored: false });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditTarget(r);
    setForm({
      name: r.name, map_label: r.map_label || '', description: r.description || '',
      address: r.address || '',
      latitude: r.latitude != null ? String(r.latitude) : '',
      longitude: r.longitude != null ? String(r.longitude) : '',
      discount_info: r.discount_info || '', discount_terms: r.discount_terms || '',
      rating: r.rating != null ? String(r.rating) : '',
      review: r.review || '', reviewer_name: r.reviewer_name || '',
      category: r.category || '맛집', price_range: r.price_range || '',
      is_sponsored: r.is_sponsored || false
    });
    setShowForm(true);
  };

  const sorted = koreanSort(restaurants, 'name');

  // Group by category
  const grouped = {};
  sorted.forEach(r => {
    const key = r.category || '기타';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '600', color: '#111827' }}>장소 관리</Text>
        {!showForm && (
          <TouchableOpacity onPress={openAdd} style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Plus size={14} weight="bold" color="white" />
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '500' }}>장소 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 10 }}>
          <Text style={{ fontWeight: '600', color: '#111827' }}>{editTarget ? '장소 수정' : '새 장소 추가'}</Text>
          <Field label="장소 이름 *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="장소 이름" />
          <Field label="지도 표시 이름" value={form.map_label} onChange={v => setForm(f => ({ ...f, map_label: v }))} placeholder="지도 표시 이름" />
          <Field label="주소" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="주소" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="위도" value={form.latitude} onChange={v => setForm(f => ({ ...f, latitude: v }))} placeholder="52.3676" keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Field label="경도" value={form.longitude} onChange={v => setForm(f => ({ ...f, longitude: v }))} placeholder="4.9041" keyboardType="numeric" /></View>
          </View>
          <Field label="할인 정보" value={form.discount_info} onChange={v => setForm(f => ({ ...f, discount_info: v }))} placeholder="10% 할인" />
          <Field label="할인 조건" value={form.discount_terms} onChange={v => setForm(f => ({ ...f, discount_terms: v }))} placeholder="주말 제외" />
          <Field label="설명" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="설명" multiline />
          <Field label="평점 (0~5)" value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} placeholder="4.5" keyboardType="numeric" />
          <Field label="리뷰어 이름" value={form.reviewer_name} onChange={v => setForm(f => ({ ...f, reviewer_name: v }))} placeholder="리뷰어 이름" />
          <Field label="리뷰" value={form.review} onChange={v => setForm(f => ({ ...f, review: v }))} placeholder="리뷰 내용" multiline />

          {/* Category picker */}
          <View>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SPOT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: form.category === cat ? '#2563eb' : '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 12, color: form.category === cat ? 'white' : '#4b5563' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Price range picker */}
          <View>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>가격대</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['€', '€€', '€€€', '€€€€'].map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setForm(f => ({ ...f, price_range: p }))}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: form.price_range === p ? '#2563eb' : '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 12, color: form.price_range === p ? 'white' : '#4b5563' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sponsored toggle */}
          <TouchableOpacity
            onPress={() => setForm(f => ({ ...f, is_sponsored: !f.is_sponsored }))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: form.is_sponsored ? '#f97316' : '#d1d5db', backgroundColor: form.is_sponsored ? '#f97316' : 'white', alignItems: 'center', justifyContent: 'center' }}>
              {form.is_sponsored && <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 14, color: '#374151' }}>제휴/스폰서</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity onPress={handleSave} style={{ flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{editTarget ? '수정 완료' : '추가'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetForm} style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#4b5563', fontSize: 14 }}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {restaurants.length === 0 ? (
        <Text style={{ color: '#6b7280', fontSize: 14 }}>등록된 장소가 없어요.</Text>
      ) : (
        Object.entries(grouped).map(([cat, places]) => (
          <View key={cat}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', paddingTop: 8, marginBottom: 8 }}>
              {cat} ({places.length})
            </Text>
            {places.map(r => (
              <View key={r.id} style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{r.name}</Text>
                      {r.is_sponsored && (
                        <View style={{ backgroundColor: '#fff7ed', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 10, color: '#ea580c' }}>제휴</Text>
                        </View>
                      )}
                    </View>
                    {r.address ? <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{r.address}</Text> : null}
                    {r.discount_info ? <Text style={{ fontSize: 12, color: '#f97316', marginTop: 2 }}>{r.discount_info.replace(/<[^>]+>/g, '')}</Text> : null}
                    {r.rating > 0 ? <Text style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>★ {r.rating}</Text> : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => openEdit(r)}>
                      <Text style={{ fontSize: 12, color: '#2563eb' }}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(r.id)}>
                      <Text style={{ fontSize: 12, color: '#ef4444' }}>삭제</Text>
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
