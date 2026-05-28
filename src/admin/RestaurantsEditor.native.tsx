// src/admin/RestaurantsEditor.native.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

type RestaurantsEditorProps = {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  editTarget: any;
  uploading: boolean;

  // admin.jsx에서 내려오는 것들(웹 호환용이지만 여기서는 사용하지 않습니다)
  imagePreviews: any[];
  setImagePreviews: React.Dispatch<React.SetStateAction<any[]>>;
  pendingReplacements: any[];
  setPendingReplacements: React.Dispatch<React.SetStateAction<any[]>>;
  handleAddImage: () => void;
  handleCropImage: (idx: number, isExisting: boolean) => void;
  handleRemoveImage: (idx: number, isExisting: boolean) => void;

  // 핵심: 최종 imageUrls를 넘기는 저장 함수
  handleSave: (override?: { imageUrls?: string[] }) => Promise<void> | void;
  resetForm: () => void;
};

// ─── 스타일 상수 ──────────────────────────────────────────────────────────────

const colors = {
  cardBg: '#ffffff',
  cardBorder: '#f3f4f6',
  label: '#6b7280',
  placeholder: '#9ca3af',
  text: '#111827',
  primary: '#2563eb',
  secondaryBg: '#f3f4f6',
  secondaryText: '#4b5563',
  accent: '#2563eb',
};

const radius = {
  lg: 8,
  xl2: 16,
};

const spacing = {
  2: 8,
  3: 12,
  5: 20,
};

// ─── 이미지 상태 타입 ──────────────────────────────────────────────────────────

type ExistingItem = { kind: 'existing'; url: string };
type NewItem = { kind: 'new'; uri: string; name: string };
type ImageItem = ExistingItem | NewItem;

type PendingReplacement = {
  originalUrl: string;
  uri: string;
  name: string;
};

// ─── Storage helper (place-images 버킷) ───────────────────────────────────────

async function uploadFromUriToPlaceBucket(uri: string, name: string) {
  const res = await fetch(uri);
  const blob = await res.blob();

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
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

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

const RestaurantsEditor: React.FC<RestaurantsEditorProps> = ({
  form,
  setForm,
  editTarget,
  uploading,
  handleSave,
  resetForm,
}) => {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pendingReplacements, setPendingReplacements] = useState<
    PendingReplacement[]
  >([]);

  // editTarget 또는 form.image_urls 변경 시 초기화
  useEffect(() => {
    const initial =
      (editTarget?.image_urls ?? form.image_urls ?? []) as string[];
    const arr: ImageItem[] = (initial || []).map((url) => ({
      kind: 'existing',
      url,
    }));
    setItems(arr);
    setPendingReplacements([]);
  }, [editTarget?.id, (form.image_urls || []).join('|')]);

  const fieldLabel = (label: string) => (
    <Text
      style={{
        fontSize: 12,
        color: colors.label,
        marginBottom: 4,
      }}
    >
      {label}
    </Text>
  );

  const inputStyle = (multiline = false) => ({
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    minHeight: multiline ? 80 : undefined,
    textAlignVertical: multiline ? ('top' as const) : ('center' as const),
  });

  // ── 이미지 조작 로직 ────────────────────────────────────────────────────────

  const addImages = async (allowsEditing: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: !allowsEditing,
      allowsEditing,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (result.canceled) return;

    if (allowsEditing) {
      const asset = result.assets[0];
      setItems((prev) => [
        ...prev,
        {
          kind: 'new',
          uri: asset.uri,
          name: asset.fileName || 'cropped.jpg',
        },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        ...result.assets.map(
          (asset): ImageItem => ({
            kind: 'new',
            uri: asset.uri,
            name: asset.fileName || 'image.jpg',
          }),
        ),
      ]);
    }
  };

  const cropExistingItem = async (index: number) => {
    const item = items[index];
    if (!item || item.kind !== 'existing') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setPendingReplacements((prev) => [
      ...prev.filter((p) => p.originalUrl !== item.url),
      {
        originalUrl: item.url,
        uri: asset.uri,
        name: asset.fileName || 'cropped.jpg',
      },
    ]);
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (!item) return;

    if (item.kind === 'existing') {
      Alert.alert('삭제', '이 사진을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const fileName = item.url.split('/').pop();
            if (fileName) {
              await supabase.storage
                .from('place-images')
                .remove([fileName]);
            }
            setPendingReplacements((prev) =>
              prev.filter((p) => p.originalUrl !== item.url),
            );
            setItems((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]);
    } else {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  // ── 저장: 이미지 업로드 후 handleSave({ imageUrls }) 호출 ────────────────────

  const submit = async () => {
    if (!form.name) {
      Alert.alert('오류', '장소 이름을 입력해주세요.');
      return;
    }

    try {
      const finalUrls: string[] = [];

      for (const item of items) {
        if (item.kind === 'existing') {
          const pending = pendingReplacements.find(
            (p) => p.originalUrl === item.url,
          );
          if (!pending) {
            finalUrls.push(item.url);
            continue;
          }

          const oldName = item.url.split('/').pop();
          if (oldName) {
            await supabase.storage
              .from('place-images')
              .remove([oldName]);
          }

          const newUrl = await uploadFromUriToPlaceBucket(
            pending.uri,
            pending.name,
          );
          finalUrls.push(newUrl);
        } else {
          const newUrl = await uploadFromUriToPlaceBucket(
            item.uri,
            item.name,
          );
          finalUrls.push(newUrl);
        }
      }

      // form.image_urls도 갱신해 놓으면 웹에서 다시 열 때 순서가 맞습니다.
      setForm((f: any) => ({ ...f, image_urls: finalUrls }));

      // RestaurantsTab.handleSave → Supabase 저장
      await handleSave({ imageUrls: finalUrls });
    } catch (e: any) {
      Alert.alert(
        '오류',
        e?.message || '이미지 업로드/저장 중 오류가 발생했습니다.',
      );
    }
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 24,
      }}
    >
      <View
        style={{
          width: '100%',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 770,
            marginTop: spacing[2],
            backgroundColor: colors.cardBg,
            borderRadius: radius.xl2,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing[5],
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          {/* 제목 */}
          <Text
            style={{
              fontWeight: '600',
              color: colors.text,
              fontSize: 14,
              marginBottom: spacing[3],
            }}
          >
            {editTarget ? '장소 수정' : '새 장소'}
          </Text>

          {/* 이름 / 지도표시 이름 */}
          <TextInput
            placeholder="장소 이름 *"
            placeholderTextColor={colors.placeholder}
            value={form.name}
            onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
            style={inputStyle(false)}
          />

          <View style={{ marginTop: spacing[3] }}>
            <TextInput
              placeholder="지도 표시 이름"
              placeholderTextColor={colors.placeholder}
              value={form.map_label}
              onChangeText={(v) =>
                setForm((f: any) => ({ ...f, map_label: v }))
              }
              style={inputStyle(false)}
            />
          </View>

          {/* 주소 */}
          <View style={{ marginTop: spacing[3] }}>
            {fieldLabel('주소')}
            <TextInput
              placeholder="주소"
              placeholderTextColor={colors.placeholder}
              value={form.address}
              onChangeText={(v) =>
                setForm((f: any) => ({ ...f, address: v }))
              }
              style={inputStyle(false)}
            />
          </View>

          {/* 위도/경도 */}
          <View
            style={{
              marginTop: spacing[3],
              flexDirection: 'row',
              columnGap: spacing[2],
            }}
          >
            <View style={{ flex: 1 }}>
              {fieldLabel('위도')}
              <TextInput
                placeholder="52.3676"
                placeholderTextColor={colors.placeholder}
                value={form.latitude}
                onChangeText={(v) =>
                  setForm((f: any) => ({ ...f, latitude: v }))
                }
                style={inputStyle(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              {fieldLabel('경도')}
              <TextInput
                placeholder="4.9041"
                placeholderTextColor={colors.placeholder}
                value={form.longitude}
                onChangeText={(v) =>
                  setForm((f: any) => ({ ...f, longitude: v }))
                }
                style={inputStyle(false)}
              />
            </View>
          </View>

          {/* 설명 */}
          <View style={{ marginTop: spacing[3] }}>
            {fieldLabel('설명')}
            <TextInput
              placeholder="장소 설명"
              placeholderTextColor={colors.placeholder}
              value={form.description}
              onChangeText={(v) =>
                setForm((f: any) => ({ ...f, description: v }))
              }
              multiline
              style={inputStyle(true)}
            />
          </View>

          {/* 평점 / 가격대 */}
          <View
            style={{
              marginTop: spacing[3],
              flexDirection: 'row',
              columnGap: spacing[2],
            }}
          >
            <View style={{ flex: 1 }}>
              {fieldLabel('평점 (0~5)')}
              <TextInput
                placeholder="4.5"
                placeholderTextColor={colors.placeholder}
                value={form.rating}
                onChangeText={(v) =>
                  setForm((f: any) => ({ ...f, rating: v }))
                }
                style={inputStyle(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              {fieldLabel('가격대')}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  columnGap: 8,
                  rowGap: 4,
                  marginTop: 4,
                }}
              >
                {['€', '€€', '€€€', '€€€€'].map((p) => {
                  const active = form.price_range === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() =>
                        setForm((f: any) => ({ ...f, price_range: p }))
                      }
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? colors.accent : '#e5e7eb',
                        backgroundColor: active ? '#2563eb' : '#f3f4f6',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: active ? '#ffffff' : '#374151',
                        }}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 카테고리 */}
          <View style={{ marginTop: spacing[3] }}>
            {fieldLabel('카테고리')}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                columnGap: 8,
                rowGap: 4,
                marginTop: 4,
              }}
            >
              {SPOT_CATEGORIES.map((cat) => {
                const active = form.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() =>
                      setForm((f: any) => ({ ...f, category: cat }))
                    }
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? colors.accent : '#e5e7eb',
                      backgroundColor: active ? '#2563eb' : '#f3f4f6',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: active ? '#ffffff' : '#374151',
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 제휴/스폰서 */}
          <View style={{ marginTop: spacing[3] }}>
            <TouchableOpacity
              onPress={() =>
                setForm((f: any) => ({
                  ...f,
                  is_sponsored: !f.is_sponsored,
                }))
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: 8,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: form.is_sponsored
                    ? '#f97316'
                    : '#e5e7eb',
                  backgroundColor: form.is_sponsored
                    ? '#f97316'
                    : '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {form.is_sponsored && (
                  <Text
                    style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}
                  >
                    ✓
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.secondaryText,
                }}
              >
                제휴/스폰서
              </Text>
            </TouchableOpacity>
          </View>

          {/* 리뷰어 / 리뷰 */}
          <View style={{ marginTop: spacing[3] }}>
            {fieldLabel('리뷰어')}
            <TextInput
              placeholder="리뷰어 이름"
              placeholderTextColor={colors.placeholder}
              value={form.reviewer_name}
              onChangeText={(v) =>
                setForm((f: any) => ({ ...f, reviewer_name: v }))
              }
              style={inputStyle(false)}
            />
          </View>
          <View style={{ marginTop: spacing[3] }}>
            {fieldLabel('리뷰')}
            <TextInput
              placeholder="리뷰 내용"
              placeholderTextColor={colors.placeholder}
              value={form.review}
              onChangeText={(v) =>
                setForm((f: any) => ({ ...f, review: v }))
              }
              multiline
              style={inputStyle(true)}
            />
          </View>

          {/* 사진 섹션 */}
          <View style={{ marginTop: spacing[3] }}>
            {fieldLabel('사진')}

            {items.length === 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.placeholder,
                  marginBottom: 8,
                }}
              >
                아직 추가된 사진이 없습니다.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    columnGap: 8,
                  }}
                >
                  {items.map((item, idx) => {
                    const key =
                      item.kind === 'existing'
                        ? `ex-${item.url}`
                        : `new-${item.uri}`;
                    const uri =
                      item.kind === 'existing' ? item.url : item.uri;

                    return (
                      <View
                        key={key}
                        style={{
                          width: 96,
                          alignItems: 'center',
                        }}
                      >
                        <Image
                          source={{ uri }}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor:
                              item.kind === 'existing'
                                ? '#e5e7eb'
                                : '#bfdbfe',
                            backgroundColor: '#f9fafb',
                          }}
                        />
                        <View
                          style={{
                            flexDirection: 'row',
                            marginTop: 4,
                            columnGap: 4,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => moveItem(idx, -1)}
                            style={{
                              paddingHorizontal: 4,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: '#e5e7eb',
                            }}
                          >
                            <Text style={{ fontSize: 10 }}>{'◀'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveItem(idx, 1)}
                            style={{
                              paddingHorizontal: 4,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: '#e5e7eb',
                            }}
                          >
                            <Text style={{ fontSize: 10 }}>{'▶'}</Text>
                          </TouchableOpacity>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            marginTop: 2,
                            columnGap: 4,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => cropExistingItem(idx)}
                            disabled={item.kind !== 'existing'}
                            style={{
                              paddingHorizontal: 4,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor:
                                item.kind === 'existing'
                                  ? '#bfdbfe'
                                  : '#e5e7eb',
                              opacity:
                                item.kind === 'existing' ? 1 : 0.6,
                            }}
                          >
                            <Text style={{ fontSize: 10 }}>✂️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeItem(idx)}
                            style={{
                              paddingHorizontal: 4,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: '#fecaca',
                            }}
                          >
                            <Text style={{ fontSize: 10 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* 업로드 버튼 두 개 */}
            <View
              style={{
                flexDirection: 'row',
                columnGap: spacing[2],
                marginTop: spacing[2],
              }}
            >
              <TouchableOpacity
                onPress={() => addImages(false)}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#d1d5db',
                  borderRadius: radius.lg,
                  paddingVertical: spacing[2],
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.secondaryText,
                    fontWeight: '500',
                  }}
                >
                  📁 그냥 업로드
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.placeholder,
                    marginTop: 2,
                  }}
                >
                  자르기 없이 여러 장 선택
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => addImages(true)}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#fed7aa',
                  borderRadius: radius.lg,
                  paddingVertical: spacing[2],
                  alignItems: 'center',
                  backgroundColor: '#fff7ed',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: '#ea580c',
                    fontWeight: '500',
                  }}
                >
                  ✂️ 자르기 업로드
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.placeholder,
                    marginTop: 2,
                  }}
                >
                  한 장 선택 후 비율 맞춰 자르기
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 버튼들 */}
          <View
            style={{
              flexDirection: 'row',
              columnGap: spacing[2],
              marginTop: spacing[3],
            }}
          >
            <TouchableOpacity
              onPress={submit}
              disabled={uploading}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                paddingVertical: spacing[2],
                alignItems: 'center',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {uploading ? '저장 중...' : editTarget ? '수정 완료' : '추가'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetForm}
              style={{
                flex: 1,
                backgroundColor: colors.secondaryBg,
                borderRadius: radius.lg,
                paddingVertical: spacing[2],
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.secondaryText,
                  fontSize: 14,
                }}
              >
                취소
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default RestaurantsEditor;