import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Lock, ForkKnife, Calendar, Users } from 'phosphor-react-native';
import { supabase } from '../src/lib/supabase';
import {
  MAP_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from '../src/lib/mapCategories';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapViewComponent from '../src/components/MapView';
import { SpotCard } from '../src/components/SpotCard';

export default function PublicPage() {
  const [activeTab, setActiveTab] = useState('map');
  const [restaurants, setRestaurants] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      setRestaurants(data || []);
    };

    fetchRestaurants();
  }, []);

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
        <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>UvA-IN</Text>

        <TouchableOpacity
          onPress={() => router.push('/login')}
          style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}
        >
          <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '500' }}>로그인</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'map' && <PublicMapTab restaurants={restaurants} />}
        {activeTab === 'membership' && <MembershipTab />}
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
        {[
          { key: 'map', label: 'SPOT', Icon: MapPin },
          { key: 'membership', label: 'Membership', Icon: Lock },
        ].map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', gap: 2 }}
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

function PublicMapTab({ restaurants }) {
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState('전체');

  const filtered = useMemo(
    () =>
      activeCategory === '전체'
        ? restaurants
        : restaurants.filter((r) => r.category === activeCategory),
    [restaurants, activeCategory]
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
          maxHeight: 48, // 살짝 낮게
        }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 6, // 전체 높이도 조금 줄임
          gap: 8,
        }}
      >
        {MAP_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const iconSvg = CATEGORY_ICONS[cat];

          // PWA 스타일: 비활성은 오렌지 아이콘, 활성은 흰색 아이콘
          const iconColor = isActive ? 'white' : '#f97316';
          const coloredIcon = iconSvg.replace('fill="currentColor"', `fill="${iconColor}"`);

          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setActiveCategory(cat);
                setSelected(null);
              }}
              style={{
                paddingHorizontal: 12, // 조금 더 길게
                paddingVertical: 1, // 조금 더 얇게
                borderRadius: 999,
                backgroundColor: isActive ? '#f97316' : '#FAFAF8',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {/* Icon */}
              <View style={{ width: 16, height: 16 }}>
                <div
                  dangerouslySetInnerHTML={{ __html: coloredIcon }}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              </View>

              {/* Label */}
              <Text
  style={{
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '500',
    color: isActive ? 'white' : '#4b5563',
    marginTop: -1,
  }}
>
  {CATEGORY_LABELS[cat] ?? cat}
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

function MembershipTab() {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <View style={{ width: '100%', maxWidth: 384 }}>
        {/* Title */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Lock size={48} weight="fill" color="#f97316" />
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#111827',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            UvA-IN Membership
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            UvA-IN 멤버십에 가입하고 다양한 혜택을 누리세요!
          </Text>
        </View>

        {/* Benefits */}
        <View style={{ gap: 12, marginBottom: 32 }}>
          {[
            {
              Icon: ForkKnife,
              color: '#f97316',
              title: '제휴 레스토랑 / 카페 할인',
              desc: '암스테르담 내 제휴 장소에서 멤버십 할인 혜택',
            },
            {
              Icon: Calendar,
              color: '#3b82f6',
              title: '학생회 이벤트 우선 참가',
              desc: '이벤트 참가비 무료 및 할인 혜택',
            },
            {
              Icon: Users,
              color: '#22c55e',
              title: 'UvA 한인 네트워크',
              desc: '암스테르담 한인 학생 커뮤니티 참여',
            },
          ].map(({ Icon, color, title, desc }) => (
            <View
              key={title}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#f3f4f6',
                padding: 16,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <Icon size={24} weight="fill" color={color} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '600',
                    color: '#111827',
                    fontSize: 14,
                    marginBottom: 2,
                  }}
                >
                  {title}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Login button */}
        <TouchableOpacity
          onPress={() => router.push('/login')}
          style={{
            backgroundColor: '#f97316',
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>로그인</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}