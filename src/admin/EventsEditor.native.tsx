// src/admin/EventsEditor.native.tsx
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
import type { EventFormState, EventRow } from './useEventForm';

export type EventsEditorProps = {
  form: EventFormState;
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>;
  imageUrls: string[];
  setImageUrls: (urls: string[]) => void;
  uploading: boolean;
  editTarget: EventRow | null;
  onSave: (args: { imageUrls: string[] }) => Promise<void>;
  onCancel: () => void;
};

// ─── 스타일 상수 (PWA 느낌만 맞춤) ─────────────────────────────────────────────

const colors = {
  cardBg: '#ffffff',
  cardBorder: '#f3f4f6',
  label: '#6b7280',
  placeholder: '#9ca3af',
  text: '#111827',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  secondaryBg: '#f3f4f6',
  secondaryText: '#4b5563',
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

// ─── 이미지 상태 타입 ───────────────────────────────────────────────────────────

// 리스트에 표시할 항목: 기존 URL 또는 새 이미지 URI
type ExistingItem = { kind: 'existing'; url: string };
type NewItem = { kind: 'new'; uri: string; name: string };
type ImageItem = ExistingItem | NewItem;

// 기존 URL에 대한 교체(크롭) 대기 항목
type PendingReplacement = {
  originalUrl: string;
  uri: string;
  name: string;
};

// ─── Storage helper (event-images 버킷) ────────────────────────────────────────

async function uploadFromUriToEventBucket(uri: string, name: string) {
  const res = await fetch(uri);
  const blob = await res.blob();

  const ext = (name && name.split('.').pop()) || 'jpg';
  const fileName = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, blob);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── 컴포넌트 본체 ─────────────────────────────────────────────────────────────

const EventsEditor: React.FC<EventsEditorProps> = ({
  form,
  setForm,
  imageUrls,
  setImageUrls,
  uploading,
  editTarget,
  onSave,
  onCancel,
}) => {
  // 하나의 리스트로 기존 + 새 이미지를 관리
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pendingReplacements, setPendingReplacements] = useState<
    PendingReplacement[]
  >([]);

  useEffect(() => {
    const initial = (editTarget?.image_urls ?? imageUrls ?? []).map(
      (url) => ({ kind: 'existing', url } as ImageItem),
    );
    setItems(initial);
    setPendingReplacements([]);
  }, [editTarget?.id, imageUrls.join('|')]);

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

  // ── 이미지 리스트 조작 ───────────────────────────────────────────────────────

  const addImages = async (allowsEditing: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: !allowsEditing,
      allowsEditing,
      aspect: [4, 5], // 웹에서 주로 쓰는 4:5 비율
      quality: 0.9,
    });

    if (result.canceled) return;

    if (allowsEditing) {
      // 자르기 업로드: 한 장만 선택된다고 가정
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
      // 그냥 업로드: 여러 장
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
            // Storage에서도 삭제 (웹과 동일한 동작)
            const fileName = item.url.split('/').pop();
            if (fileName) {
              await supabase.storage.from('event-images').remove([fileName]);
            }
            setPendingReplacements((prev) =>
              prev.filter((p) => p.originalUrl !== item.url),
            );
            setItems((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]);
    } else {
      // 새 이미지인 경우 그냥 리스트에서 제거
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = tmp;
      return next;
    });
  };

  // ── 저장: 모든 이미지를 순서대로 업로드 후 onSave 호출 ───────────────────────

  const submit = async () => {
    if (!form.title) {
      Alert.alert('오류', '제목을 입력해주세요.');
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

          // 기존 파일 삭제
          const oldName = item.url.split('/').pop();
          if (oldName) {
            await supabase.storage
              .from('event-images')
              .remove([oldName]);
          }

          const newUrl = await uploadFromUriToEventBucket(
            pending.uri,
            pending.name,
          );
          finalUrls.push(newUrl);
        } else {
          const newUrl = await uploadFromUriToEventBucket(
            item.uri,
            item.name,
          );
          finalUrls.push(newUrl);
        }
      }

      // 상위 폼 상태 업데이트 + DB 저장
      setImageUrls(finalUrls);
      await onSave({ imageUrls: finalUrls });
    } catch (e: any) {
      Alert.alert(
        '오류',
        e?.message || '이미지 업로드/저장 중 오류가 발생했습니다.',
      );
    }
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  return (
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
          {editTarget ? '이벤트 수정' : '새 이벤트'}
        </Text>

        {/* 이벤트 제목 */}
        <TextInput
          placeholder="이벤트 제목"
          placeholderTextColor={colors.placeholder}
          value={form.title}
          onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
          style={inputStyle(false)}
        />

        {/* 내용 */}
        <View style={{ marginTop: spacing[3] }}>
          {fieldLabel('내용')}
          <TextInput
            placeholder="내용을 입력하세요"
            placeholderTextColor={colors.placeholder}
            value={form.description}
            onChangeText={(v) =>
              setForm((f) => ({ ...f, description: v }))
            }
            multiline
            style={inputStyle(true)}
          />
        </View>

        {/* 장소 */}
        <View style={{ marginTop: spacing[3] }}>
          {fieldLabel('장소')}
          <TextInput
            placeholder="장소를 입력하세요"
            placeholderTextColor={colors.placeholder}
            value={form.location}
            onChangeText={(v) =>
              setForm((f) => ({ ...f, location: v }))
            }
            multiline
            style={inputStyle(true)}
          />
        </View>

        {/* 날짜 / 시간 */}
        <View
          style={{
            marginTop: spacing[3],
            flexDirection: 'row',
            columnGap: spacing[2],
          }}
        >
          <View style={{ flex: 1 }}>
            {fieldLabel('날짜 (YYYY-MM-DD)')}
            <TextInput
              placeholder="2026-05-08"
              placeholderTextColor={colors.placeholder}
              value={form.eventDate}
              onChangeText={(v) =>
                setForm((f) => ({ ...f, eventDate: v }))
              }
              style={inputStyle(false)}
            />
          </View>
          <View style={{ flex: 1 }}>
            {fieldLabel('시간 (HH:MM)')}
            <TextInput
              placeholder="19:00"
              placeholderTextColor={colors.placeholder}
              value={form.eventTime}
              onChangeText={(v) =>
                setForm((f) => ({ ...f, eventTime: v }))
              }
              style={inputStyle(false)}
            />
          </View>
        </View>

        {/* 인스타그램 URL */}
        <View style={{ marginTop: spacing[3] }}>
          <TextInput
            placeholder="https://instagram.com/... (선택)"
            placeholderTextColor={colors.placeholder}
            value={form.instagram_url}
            onChangeText={(v) =>
              setForm((f) => ({ ...f, instagram_url: v }))
            }
            style={inputStyle(false)}
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
              <View style={{ flexDirection: 'row', columnGap: 8 }}>
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
                        {/* 왼쪽/오른쪽 이동 */}
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
                        {/* 크롭 (기존 이미지일 때만 의미 있음) */}
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
                            opacity: item.kind === 'existing' ? 1 : 0.6,
                          }}
                        >
                          <Text style={{ fontSize: 10 }}>✂️</Text>
                        </TouchableOpacity>
                        {/* 삭제 */}
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
                borderColor: '#bfdbfe',
                borderRadius: radius.lg,
                paddingVertical: spacing[2],
                alignItems: 'center',
                backgroundColor: '#eff6ff',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
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
            onPress={onCancel}
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
  );
};

export default EventsEditor;