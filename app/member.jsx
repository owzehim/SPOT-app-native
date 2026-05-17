import { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, Calendar, MapPin } from 'phosphor-react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../src/lib/supabase';
import { useQRToken } from '../src/hooks/useQRToken';
import { broadcastQRExpiry } from '../src/lib/qrSync';
import { MAP_CATEGORIES } from '../src/lib/mapCategories';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapViewComponent from '../src/components/MapView';
import { SpotCard } from '../src/components/SpotCard';
import { CATEGORY_ICONS } from '../src/lib/mapCategories';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MemberPage() {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('qr');
  const [events, setEvents] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const { token, secondsLeft } = useQRToken(member?.totp_secret);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: memberData } = await supabase
        .from('members').select('*').eq('user_id', user.id).single();
      const { data: adminData } = await supabase
        .from('admin_roles').select('id').eq('user_id', user.id).single();
      const { data: eventData } = await supabase
        .from('events').select('*').order('event_date', { ascending: true });
      const { data: restaurantData } = await supabase
        .from('restaurants').select('*').order('created_at', { ascending: false });

      setMember(memberData);
      setIsAdmin(!!adminData);
      setEvents(eventData || []);
      setRestaurants(restaurantData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#6b7280' }}>로딩 중...</Text>
      </View>
    );
  }

  const qrValue = token ? 'https://uvain-app.vercel.app/verify/' + token + '_' + member?.student_number : '';
  const isValid = member?.is_member && member?.membership_valid_until && new Date(member.membership_valid_until) >= new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>SPOT</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isAdmin && (
            <TouchableOpacity onPress={() => router.push('/admin')} style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '500' }}>관리자</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f3f4f6' }}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'qr' && (
          <QRTab member={member} isValid={isValid} qrValue={qrValue} secondsLeft={secondsLeft} />
        )}
        {activeTab === 'events' && <EventsTab events={events} />}
        {activeTab === 'map' && <MapTab restaurants={restaurants} />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={{ backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row' }}>
        {[
          { key: 'qr', label: 'MY', Icon: QrCode },
          { key: 'events', label: 'EVENTS', Icon: Calendar },
          { key: 'map', label: 'SPOT', Icon: MapPin },
        ].map(({ key, label, Icon }) => (
          <TouchableOpacity key={key} onPress={() => setActiveTab(key)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', gap: 2 }}>
            <Icon size={20} weight={activeTab === key ? 'fill' : 'regular'} color={activeTab === key ? '#f97316' : '#9ca3af'} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: activeTab === key ? '#f97316' : '#9ca3af' }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── QR Tab ────────────────────────────────────────────────────────────────── 
function QRTab({ member, isValid, qrValue, secondsLeft }) {
  const router = useRouter();

  useEffect(() => {
    if (!member?.student_number) return;
    broadcastQRExpiry(member.student_number);
  }, [qrValue, member?.student_number]);

  const totalSeconds = 15;
  const progressPercent = ((secondsLeft || 0) / totalSeconds) * 100;
  const displaySeconds = secondsLeft ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, maxWidth: 448, alignSelf: 'center', width: '100%', gap: 16 }}>
      {/* Member info card */}
      <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontWeight: '600', color: '#111827', fontSize: 15 }}>
            {member?.first_name} {member?.last_name}
          </Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: isValid ? '#dcfce7' : '#fee2e2' }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: isValid ? '#15803d' : '#dc2626' }}>
              {isValid ? '✓ 유효' : '✗ 만료'}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, color: '#4b5563', marginBottom: 2 }}>학번: {member?.student_number}</Text>
        <Text style={{ fontSize: 14, color: '#4b5563', marginBottom: 2 }}>전공: {member?.major}</Text>
        <Text style={{ fontSize: 14, color: '#4b5563' }}>유효기간: {member?.membership_valid_until ?? '없음'}</Text>
      </View>

      {/* QR Code or expired */}
      {isValid ? (
        <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>멤버십 QR 코드</Text>
          <View style={{ padding: 12, borderRadius: 12, borderWidth: 4, borderColor: '#f97316' }}>
            {qrValue ? <QRCode value={qrValue} size={200} /> : null}
          </View>
          <View style={{ width: '100%', marginTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#4b5563' }}>QR 갱신까지</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>{displaySeconds}초</Text>
            </View>
            <View style={{ width: '100%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ height: '100%', backgroundColor: '#f97316', borderRadius: 999, width: `${progressPercent}%` }} />
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>15초마다 자동 갱신됩니다</Text>
        </View>
      ) : (
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, borderWidth: 1, borderColor: '#fee2e2', padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#dc2626', fontWeight: '500' }}>멤버십이 유효하지 않습니다</Text>
          <Text style={{ fontSize: 14, color: '#f87171', marginTop: 4 }}>임원에게 문의하세요</Text>
        </View>
      )}

      {/* Scan button */}
      {isValid && (
        <TouchableOpacity onPress={() => router.push('/scan')} style={{ backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>🎟 매장 QR 스캔하기</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Events Tab ─────────────────────────────────────────────────────────────── 
function EventsTab({ events }) {
  const [expandedId, setExpandedId] = useState(null);
  const [slideIndexes, setSlideIndexes] = useState({});
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false);

  const setSlide = (eventId, idx) => setSlideIndexes((prev) => ({ ...prev, [eventId]: idx }));

  const addToCalendar = (ev) => {
    const start = new Date(ev.event_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => d.getUTCFullYear() + '' + pad(d.getUTCMonth() + 1) + '' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + '' + pad(d.getUTCMinutes()) + '00Z';
    const ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:' + fmt(start) + '\nDTEND:' + fmt(end) + '\nSUMMARY:' + ev.title + '\nLOCATION:' + (ev.location || '') + '\nDESCRIPTION:' + (ev.description || '') + '\nEND:VEVENT\nEND:VCALENDAR';
    const encoded = encodeURIComponent(ics);
    Linking.openURL('data:text/calendar,' + encoded);
  };

  const renderEvent = (ev) => {
    const isExpanded = expandedId === ev.id;
    const imgs = ev.image_urls || [];
    const currentSlide = slideIndexes[ev.id] || 0;
    const slideWidth = SCREEN_WIDTH - 64;

    return (
      <View key={ev.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : ev.id)} style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', color: '#111827', flex: 1 }}>{ev.title}</Text>
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
          {ev.event_date && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Calendar size={14} weight="fill" color="#f97316" />
              <Text style={{ fontSize: 13, color: '#f97316' }}>
                {new Date(ev.event_date).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          )}
          {ev.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <MapPin size={14} weight="fill" color="#6b7280" />
              <Text style={{ fontSize: 13, color: '#6b7280' }}>{ev.location}</Text>
            </View>
          )}
        </TouchableOpacity>
        {isExpanded && (
          <View>
            {imgs.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#f3f4f6', aspectRatio: 1 }}>
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => { const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth); setSlide(ev.id, idx); }} style={{ width: slideWidth }}>
                    {imgs.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={{ width: slideWidth, aspectRatio: 1 }} resizeMode="contain" />
                    ))}
                  </ScrollView>
                  {imgs.length > 1 && (
                    <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                      {imgs.map((_, i) => (
                        <TouchableOpacity key={i} onPress={() => setSlide(ev.id, i)}>
                          <View style={{ width: i === currentSlide ? 8 : 6, height: i === currentSlide ? 8 : 6, borderRadius: 999, backgroundColor: i === currentSlide ? 'white' : 'rgba(255,255,255,0.5)' }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {ev.description && (
                <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 12 }}>{ev.description}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ev.event_date && (
                  <TouchableOpacity onPress={() => addToCalendar(ev)} style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <Calendar size={14} weight="fill" color="#374151" />
                    <Text style={{ fontSize: 12, color: '#374151' }}>캘린더에 추가</Text>
                  </TouchableOpacity>
                )}
                {ev.instagram_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(ev.instagram_url)} style={{ flex: 1, backgroundColor: '#f97316', borderRadius: 8, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: 'white' }}>Instagram 에서 열기</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const now = new Date();
  const upcomingEvents = events.filter((ev) => ev.event_date && new Date(ev.event_date) >= now);
  const pastEvents = events.filter((ev) => ev.event_date && new Date(ev.event_date) < now);

  // Helper function to group events by month
  const groupEventsByMonth = (eventList) => {
    const grouped = {};
    eventList.forEach((ev) => {
      const label = ev.event_date ? `${new Date(ev.event_date).getMonth() + 1}월` : '날짜 미정';
      if (!grouped[label]) {
        grouped[label] = [];
      }
      grouped[label].push(ev);
    });
    return grouped;
  };

  const renderEventsByMonth = (eventList) => {
    const grouped = groupEventsByMonth(eventList);
    return Object.entries(grouped).map(([month, monthEvents]) => (
      <View key={month}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', paddingTop: 8, marginBottom: 8 }}>
          {month}
        </Text>
        {monthEvents.map((ev) => renderEvent(ev))}
      </View>
    ));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, maxWidth: 448, alignSelf: 'center', width: '100%' }}>
      <Text style={{ fontWeight: '600', color: '#111827', fontSize: 15, marginBottom: 16 }}>EVENTS</Text>
      {events.length === 0 ? (
        <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, marginBottom: 8 }}>📅</Text>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>예정된 이벤트가 없어요</Text>
        </View>
      ) : (
        <View>
          {upcomingEvents.length > 0 && (
            <View>
              {renderEventsByMonth(upcomingEvents)}
            </View>
          )}
          {pastEvents.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <TouchableOpacity onPress={() => setPastEventsExpanded(!pastEventsExpanded)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontWeight: '600', color: '#4b5563' }}>지난 이벤트</Text>
                  <View style={{ backgroundColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>{pastEvents.length}</Text>
                  </View>
                </View>
                <Text style={{ color: '#9ca3af', fontSize: 18 }}>{pastEventsExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {pastEventsExpanded && (
                <View style={{ marginTop: 12 }}>
                  {renderEventsByMonth(pastEvents)}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Map Tab ───────────────────────────────────────────────────────── 
function MapTab({ restaurants }) {
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState('전체');

  const filtered = useMemo(
    () => activeCategory === '전체'
      ? restaurants
      : restaurants.filter((r) => r.category === activeCategory),
    [restaurants, activeCategory]
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', maxHeight: 52 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
      >
        {MAP_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const iconSvg = CATEGORY_ICONS[cat];
          const iconColor = isActive ? 'white' : '#4b5563';
          const coloredIcon = iconSvg.replace('fill="currentColor"', `fill="${iconColor}"`);

          return (
            <TouchableOpacity
              key={cat}
              onPress={() => { setActiveCategory(cat); setSelected(null); }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: isActive ? '#f97316' : '#f3f4f6',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
            >
              {/* Icon */}
              <View style={{ width: 14, height: 14 }}>
                <div
                  dangerouslySetInnerHTML={{ __html: coloredIcon }}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </View>
              {/* Label */}
              <Text style={{ fontSize: 12, fontWeight: '500', color: isActive ? 'white' : '#4b5563' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={{ flex: 1, position: 'relative' }}>
        <MapViewComponent restaurants={filtered} selected={selected} onSelect={setSelected} />
        {selected && <SpotCard selected={selected} onClose={() => setSelected(null)} />}
      </View>
    </View>
  );
}