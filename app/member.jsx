// app/member.jsx
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  QrCode,
  Calendar,
  MapPin,
  Gear, // 🔧 설정 아이콘 추가
} from 'phosphor-react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { supabase } from '../src/lib/supabase';
import { useQRToken } from '../src/hooks/useQRToken';
import { broadcastQRExpiry } from '../src/lib/qrSync';
import { MAP_CATEGORIES, CATEGORY_ICONS } from '../src/lib/mapCategories';
import MapViewComponent from '../src/components/MapView';
import { SpotCard } from '../src/components/SpotCard';
import { useI18n } from '@/i18n/LanguageContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MemberPage() {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('qr');
  const [events, setEvents] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [showSettings, setShowSettings] = useState(false); // ⚙️ 설정 화면 토글

  const { token, secondsLeft } = useQRToken(member?.totp_secret);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: adminData } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      setMember(memberData);
      setIsAdmin(!!adminData);
      setEvents(eventData || []);
      setRestaurants(restaurantData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // 탭이 QR가 아니면 설정 화면 닫기
  useEffect(() => {
    if (activeTab !== 'qr') {
      setShowSettings(false);
    }
  }, [activeTab]);

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: '#6b7280' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const qrValue = token
    ? 'https://uvain-app.vercel.app/verify/' +
      token +
      '_' +
      member?.student_number
    : '';

  const isValid =
    member?.is_member &&
    member?.membership_valid_until &&
    new Date(member.membership_valid_until) >= new Date();

  const tabs = [
    { key: 'qr', label: t('tabs.my'), Icon: QrCode },
    { key: 'events', label: t('tabs.events'), Icon: Calendar },
    { key: 'map', label: t('tabs.spot'), Icon: MapPin },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontWeight: 'bold',
            color: '#111827',
            fontSize: 16,
          }}
        >
          {t('member.header')}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/admin')}
              style={{
                backgroundColor: '#2563eb',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {t('member.adminButton')}
              </Text>
            </TouchableOpacity>
          )}

          {/* 기존 로그아웃 → 설정 아이콘으로 변경 */}
          <TouchableOpacity
            onPress={() => setShowSettings((v) => !v)}
            style={{
              padding: 6,
              borderRadius: 999,
              backgroundColor: '#f3f4f6',
            }}
          >
            <Gear size={18} weight="bold" color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'qr' && !showSettings && (
          <QRTab
            member={member}
            isValid={isValid}
            qrValue={qrValue}
            secondsLeft={secondsLeft}
          />
        )}
        {activeTab === 'qr' && showSettings && (
          <SettingsView onClose={() => setShowSettings(false)} />
        )}
        {activeTab === 'events' && <EventsTab events={events} />}
        {activeTab === 'map' && <MapTab restaurants={restaurants} />}
      </View>

      {/* Bottom Tab Bar */}
      <View
        style={{
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          flexDirection: 'row',
        }}
      >
        {tabs.map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Icon
              size={20}
              weight={activeTab === key ? 'fill' : 'regular'}
              color={activeTab === key ? '#f97316' : '#9ca3af'}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: activeTab === key ? '#f97316' : '#9ca3af',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── QR Tab ────────────────────────────────────────────────────────────────

function QRTab({ member, isValid, qrValue, secondsLeft }) {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!member?.student_number) return;
    broadcastQRExpiry(member.student_number);
  }, [qrValue, member?.student_number]);

  const totalSeconds = 15;
  const progressPercent = ((secondsLeft || 0) / totalSeconds) * 100;
  const displaySeconds = secondsLeft ?? 0;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        maxWidth: 448,
        alignSelf: 'center',
        width: '100%',
        gap: 16,
      }}
    >
      {/* Member info card */}
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#f3f4f6',
          padding: 20,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontWeight: '600',
              color: '#111827',
              fontSize: 15,
            }}
          >
            {member?.first_name} {member?.last_name}
          </Text>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: isValid ? '#dcfce7' : '#fee2e2',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: isValid ? '#15803d' : '#dc2626',
              }}
            >
              {isValid
                ? t('member.validShort')
                : t('member.expiredShort')}
            </Text>
          </View>
        </View>

        <Text
          style={{ fontSize: 14, color: '#4b5563', marginBottom: 2 }}
        >
          {t('member.studentNumber')}: {member?.student_number}
        </Text>
        <Text
          style={{ fontSize: 14, color: '#4b5563', marginBottom: 2 }}
        >
          {t('member.major')}: {member?.major}
        </Text>
        <Text style={{ fontSize: 14, color: '#4b5563' }}>
          {t('member.validUntil')}:{' '}
          {member?.membership_valid_until ?? t('common.none')}
        </Text>
      </View>

      {/* QR Code or expired */}
      {isValid ? (
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#f3f4f6',
            padding: 20,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: '#6b7280',
              marginBottom: 16,
            }}
          >
            {t('member.qrTitle')}
          </Text>

          <View
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 4,
              borderColor: '#f97316',
            }}
          >
            {qrValue ? <QRCode value={qrValue} size={200} /> : null}
          </View>

          <View style={{ width: '100%', marginTop: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{ fontSize: 14, color: '#4b5563' }}
              >
                {t('member.qrRefreshLabel')}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                }}
              >
                {displaySeconds}
                {t('member.qrSecondsSuffix')}
              </Text>
            </View>

            <View
              style={{
                width: '100%',
                height: 8,
                backgroundColor: '#e5e7eb',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  backgroundColor: '#f97316',
                  borderRadius: 999,
                  width: `${progressPercent}%`,
                }}
              />
            </View>
          </View>

          <Text
            style={{
              fontSize: 12,
              color: '#9ca3af',
              marginTop: 16,
            }}
          >
            {t('member.qrAutoRefreshNote')}
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#fee2e2',
            padding: 20,
            alignItems: 'center',
          }}
        >
          <Text
            style={{ color: '#dc2626', fontWeight: '500' }}
          >
            {t('member.membershipInvalidTitle')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#f87171',
              marginTop: 4,
            }}
          >
            {t('member.contactAdmin')}
          </Text>
        </View>
      )}

      {/* Scan button */}
      {isValid && (
        <TouchableOpacity
          onPress={() => router.push('/scan')}
          style={{
            backgroundColor: '#f97316',
            borderRadius: 16,
            paddingVertical: 14,
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
            {t('member.qrScanButton')}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Settings View (MY 탭 안 설정 화면) ────────────────────────────────

function SettingsView({ onClose }) {
  const { t, language, setLanguage } = useI18n();

  const LANG_OPTIONS = [
    { value: 'ko', label: t('settings.korean') },
    { value: 'en', label: t('settings.english') },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // AuthGate가 세션 변화를 감지해서 /public로 보내줌
  };

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        maxWidth: 448,
        alignSelf: 'center',
        width: '100%',
        gap: 12,
      }}
    >
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#f3f4f6',
          padding: 16,
          gap: 12,
        }}
      >
        {/* 제목 + 닫기 */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#111827',
            }}
          >
            {t('settings.title')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              닫기
            </Text>
          </TouchableOpacity>
        </View>

        {/* 언어 섹션 */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            paddingTop: 12,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: '#4b5563',
            }}
          >
            {t('settings.appLanguage')}
          </Text>

          {LANG_OPTIONS.map((opt) => {
            const active = language === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setLanguage(opt.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: active ? '#111827' : '#6b7280',
                  }}
                >
                  {opt.label}
                </Text>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? '#f97316' : '#d1d5db',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active ? (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: '#f97316',
                      }}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 구분선 */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            marginTop: 8,
          }}
        />

        {/* 로그아웃 (리스트 맨 아래) */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#ef4444',
            }}
          >
            {t('settings.logout')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Events Tab ─────────────────────────────────────────────────────────────

function EventsTab({ events }) {
  const [expandedId, setExpandedId] = useState(null);
  const [slideIndexes, setSlideIndexes] = useState({});
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false);
  const scrollRefs = useRef({});
  const { t, language } = useI18n();

  const setSlide = (eventId, idx) => {
    setSlideIndexes((prev) => ({ ...prev, [eventId]: idx }));
    if (scrollRefs.current[eventId]) {
      const MAX_SLIDE_WIDTH = 384;
      const slideWidth = Math.min(SCREEN_WIDTH - 64, MAX_SLIDE_WIDTH);
      scrollRefs.current[eventId].scrollTo({
        x: idx * slideWidth,
        animated: true,
      });
    }
  };

  const addToCalendar = (ev) => {
    const start = new Date(ev.event_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) =>
      d.getUTCFullYear() +
      '' +
      pad(d.getUTCMonth() + 1) +
      '' +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      '' +
      pad(d.getUTCMinutes()) +
      '00Z';

    const ics =
      'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:' +
      fmt(start) +
      '\nDTEND:' +
      fmt(end) +
      '\nSUMMARY:' +
      ev.title +
      '\nLOCATION:' +
      (ev.location || '') +
      '\nDESCRIPTION:' +
      (ev.description || '') +
      '\nEND:VEVENT\nEND:VCALENDAR';

    const encoded = encodeURIComponent(ics);
    Linking.openURL('data:text/calendar,' + encoded);
  };

  const renderEvent = (ev) => {
    const isExpanded = expandedId === ev.id;
    const imgs = ev.image_urls || [];
    const currentSlide = slideIndexes[ev.id] || 0;

    const MAX_SLIDE_WIDTH = 384;
    const slideWidth = Math.min(SCREEN_WIDTH - 64, MAX_SLIDE_WIDTH);

    return (
      <View
        key={ev.id}
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#f3f4f6',
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : ev.id)}
          activeOpacity={0.7}
        >
          <View style={{ padding: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontWeight: '600',
                  color: '#111827',
                  flex: 1,
                }}
              >
                {ev.title}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                {isExpanded ? '▲' : '▼'}
              </Text>
            </View>

            {ev.event_date ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Calendar size={14} weight="fill" color="#f97316" />
                <Text
                  style={{ fontSize: 13, color: '#f97316' }}
                >
                  {new Date(ev.event_date).toLocaleString(
                    language === 'ko' ? 'ko-KR' : 'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    },
                  )}
                </Text>
              </View>
            ) : null}

            {ev.location ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MapPin
                  size={14}
                  weight="fill"
                  color="#6b7280"
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: '#6b7280',
                  }}
                >
                  {ev.location}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {isExpanded ? (
          <View>
            {imgs.length > 0 ? (
              <View
                style={{ paddingHorizontal: 16, marginBottom: 12 }}
              >
                <View
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#f3f4f6',
                    aspectRatio: 1,
                    position: 'relative',
                  }}
                >
                  <ScrollView
                    ref={(ref) => {
                      if (ref) scrollRefs.current[ev.id] = ref;
                    }}
                    horizontal
                    pagingEnabled
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(
                        e.nativeEvent.contentOffset.x /
                          slideWidth,
                      );
                      setSlideIndexes((prev) => ({
                        ...prev,
                        [ev.id]: idx,
                      }));
                    }}
                    style={{ width: slideWidth }}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      {imgs.map((url, i) => (
                        <View
                          key={i}
                          style={{
                            width: slideWidth,
                            aspectRatio: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#f3f4f6',
                          }}
                        >
                          <Image
                            source={{ uri: url }}
                            style={{
                              width: '100%',
                              height: '100%',
                            }}
                            resizeMode="contain"
                          />
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Left arrow */}
                  {imgs.length > 1 && currentSlide > 0 ? (
                    <TouchableOpacity
                      onPress={() =>
                        setSlide(ev.id, currentSlide - 1)
                      }
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: [{ translateY: -20 }],
                        zIndex: 10,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 20,
                        width: 40,
                        height: 40,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 20,
                          fontWeight: 'bold',
                        }}
                      >
                        ‹
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Right arrow */}
                  {imgs.length > 1 &&
                  currentSlide < imgs.length - 1 ? (
                    <TouchableOpacity
                      onPress={() =>
                        setSlide(ev.id, currentSlide + 1)
                      }
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: [{ translateY: -20 }],
                        zIndex: 10,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 20,
                        width: 40,
                        height: 40,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 20,
                          fontWeight: 'bold',
                        }}
                      >
                        ›
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Pagination dots */}
                  {imgs.length > 1 ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {imgs.map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setSlide(ev.id, i)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={{
                              width:
                                i === currentSlide ? 10 : 6,
                              height:
                                i === currentSlide ? 10 : 6,
                              borderRadius: 999,
                              backgroundColor:
                                i === currentSlide
                                  ? '#f97316'
                                  : 'rgba(255,255,255,0.6)',
                              borderWidth:
                                i === currentSlide ? 0 : 1,
                              borderColor:
                                'rgba(255,255,255,0.8)',
                            }}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 20,
              }}
            >
              {ev.description ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: '#4b5563',
                    lineHeight: 20,
                    marginBottom: 12,
                  }}
                >
                  {ev.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ev.event_date ? (
                  <TouchableOpacity
                    onPress={() => addToCalendar(ev)}
                    style={{
                      flex: 1,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 8,
                      paddingVertical: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Calendar
                      size={14}
                      weight="fill"
                      color="#374151"
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#374151',
                      }}
                    >
                      {t('events.addToCalendar')}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {ev.instagram_url ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(ev.instagram_url)
                    }
                    style={{
                      flex: 1,
                      backgroundColor: '#f97316',
                      borderRadius: 8,
                      paddingVertical: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: 'white',
                      }}
                    >
                      {t('events.openInstagram')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const now = new Date();
  const upcomingEvents = events.filter(
    (ev) => ev.event_date && new Date(ev.event_date) >= now,
  );
  const pastEvents = events.filter(
    (ev) => ev.event_date && new Date(ev.event_date) < now,
  );

  const groupEventsByMonth = (eventList) => {
    const grouped = {};
    eventList.forEach((ev) => {
      let label;
      if (ev.event_date) {
        const date = new Date(ev.event_date);
        if (language === 'ko') {
          label = `${date.getMonth() + 1}월`;
        } else {
          label = date.toLocaleString('en-US', { month: 'long' });
        }
      } else {
        label = t('events.monthUnknown');
      }
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(ev);
    });
    return grouped;
  };

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        maxWidth: 448,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      <Text
        style={{
          fontWeight: '600',
          color: '#111827',
          fontSize: 15,
          marginBottom: 16,
        }}
      >
        {t('events.title')}
      </Text>

      {events.length === 0 ? (
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#f3f4f6',
            padding: 32,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 24, marginBottom: 8 }}>📅</Text>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            {t('events.noUpcoming')}
          </Text>
        </View>
      ) : (
        <View>
          {upcomingEvents.length > 0 ? (
            <View>
              {Object.entries(
                groupEventsByMonth(upcomingEvents),
              ).map(([month, monthEvents]) => (
                <View key={month}>
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
                    {month}
                  </Text>
                  {monthEvents.map((ev) => renderEvent(ev))}
                </View>
              ))}
            </View>
          ) : null}

          {pastEvents.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <TouchableOpacity
                onPress={() =>
                  setPastEventsExpanded(!pastEventsExpanded)
                }
                activeOpacity={0.7}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '600',
                        color: '#4b5563',
                      }}
                    >
                      {t('events.pastEvents')}
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#e5e7eb',
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#374151',
                          fontWeight: '500',
                        }}
                      >
                        {pastEvents.length}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: '#9ca3af',
                      fontSize: 18,
                    }}
                  >
                    {pastEventsExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {pastEventsExpanded ? (
                <View style={{ marginTop: 12 }}>
                  {Object.entries(
                    groupEventsByMonth(pastEvents),
                  ).map(([month, monthEvents]) => (
                    <View key={month}>
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
                        {month}
                      </Text>
                      {monthEvents.map((ev) => renderEvent(ev))}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Map Tab ───────────────────────────────────────────────────────────────

function MapTab({ restaurants }) {
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState('전체');

  const filtered = useMemo(
    () =>
      activeCategory === '전체'
        ? restaurants
        : restaurants.filter((r) => r.category === activeCategory),
    [restaurants, activeCategory],
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 카테고리 필터 바 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          maxHeight: 48,
        }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          gap: 8,
        }}
      >
        {MAP_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const iconSvg = CATEGORY_ICONS[cat];

          const iconColor = isActive ? 'white' : '#f97316';
          const coloredIcon = iconSvg.replace(
            'fill="currentColor"',
            `fill="${iconColor}"`,
          );

          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setActiveCategory(cat);
                setSelected(null);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: isActive ? '#f97316' : '#F8F9F6',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View style={{ width: 16, height: 16 }}>
                <SvgXml
                  xml={coloredIcon}
                  width="100%"
                  height="100%"
                />
              </View>
              {/* 한국어 카테고리 키 그대로 표시 */}
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 11,
                  fontWeight: '500',
                  color: isActive ? 'white' : '#4b5563',
                  marginTop: -1,
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1, position: 'relative' }}>
        <MapViewComponent
          restaurants={filtered}
          selected={selected}
          onSelect={setSelected}
        />
        {selected && (
          <SpotCard
            selected={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </View>
    </View>
  );
}