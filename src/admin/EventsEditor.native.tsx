// src/admin/EventsEditor.native.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
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

// ─── Tailwind 기반 PWA 디자인 값을 RN용으로 정리 ───────────────────────────────

const colors = {
  background: '#f3f4f6',      // gray-100 (주변 배경에 이미 쓰이고 있음)
  cardBg: '#ffffff',          // bg-white
  cardBorder: '#f3f4f6',      // border-gray-100
  label: '#6b7280',           // text-gray-500
  placeholder: '#9ca3af',     // text-gray-400
  text: '#111827',            // text-gray-900
  primary: '#2563eb',         // bg-blue-600
  primaryDark: '#1d4ed8',     // bg-blue-700
  secondaryBg: '#f3f4f6',     // bg-gray-100
  secondaryText: '#4b5563',   // text-gray-700
};

const radius = {
  lg: 8,      // rounded-lg
  xl: 12,
  xl2: 16,    // rounded-2xl
};

const spacing = {
  2: 8,
  3: 12,
  5: 20,
};

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

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
  const submit = () => {
    // 첫 버전: 네이티브에서는 이미지 편집 없이, 기존 이미지 배열 그대로 사용
    const final = editTarget?.image_urls ?? imageUrls ?? [];
    onSave({ imageUrls: final });
  };

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
    textAlignVertical: multiline ? 'top' as const : 'center' as const,
  });

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
          maxWidth: 770, // PWA max-w-3xl
          marginTop: spacing[2],
          backgroundColor: colors.cardBg,
          borderRadius: radius.xl2,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: spacing[5],
          // PWA의 shadow-sm 비슷하게
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
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
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
            onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
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
              onChangeText={(v) => setForm((f) => ({ ...f, eventDate: v }))}
              style={inputStyle(false)}
            />
          </View>
          <View style={{ flex: 1 }}>
            {fieldLabel('시간 (HH:MM)')}
            <TextInput
              placeholder="19:00"
              placeholderTextColor={colors.placeholder}
              value={form.eventTime}
              onChangeText={(v) => setForm((f) => ({ ...f, eventTime: v }))}
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

        {/* 사진 섹션 - 현재는 텍스트 안내만 */}
        <View style={{ marginTop: spacing[3] }}>
          {fieldLabel('사진')}
          <Text
            style={{
              fontSize: 12,
              color: colors.placeholder,
            }}
          >
            현재 iOS에서는 사진 순서·크롭 편집 없이, 기존 웹에서 설정한
            이미지를 그대로 사용합니다.
          </Text>
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