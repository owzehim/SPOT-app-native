// src/admin/EventsEditor.native.tsx
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
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

export default function EventsEditor({
  form,
  setForm,
  imageUrls,
  setImageUrls,
  uploading,
  editTarget,
  onSave,
  onCancel,
}: EventsEditorProps) {
  const submit = () => {
    // 첫 버전: 네이티브는 이미지 수정 없이 기존 이미지 배열만 그대로 전달
    const final = editTarget?.image_urls ?? imageUrls ?? [];
    onSave({ imageUrls: final });
  };

  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        margin: 16,
        gap: 10,
      }}
    >
      <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>
        {editTarget ? '이벤트 수정' : '새 이벤트'}
      </Text>

      <TextInput
        placeholder="이벤트 제목"
        value={form.title}
        onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
        }}
      />

      <TextInput
        placeholder="내용"
        multiline
        value={form.description}
        onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
          minHeight: 80,
          textAlignVertical: 'top',
        }}
      />

      <TextInput
        placeholder="장소"
        value={form.location}
        onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
        }}
      />

      <TextInput
        placeholder="날짜 (YYYY-MM-DD)"
        value={form.eventDate}
        onChangeText={(v) => setForm((f) => ({ ...f, eventDate: v }))}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
        }}
      />

      <TextInput
        placeholder="시간 (HH:MM)"
        value={form.eventTime}
        onChangeText={(v) => setForm((f) => ({ ...f, eventTime: v }))}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
        }}
      />

      <TextInput
        placeholder="인스타그램 URL"
        value={form.instagram_url}
        onChangeText={(v) => setForm((f) => ({ ...f, instagram_url: v }))}
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
        }}
      />

      {/* TODO: 나중에 expo-image-picker / image-manipulator로 이미지 업로드/크롭 추가 */}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          onPress={submit}
          disabled={uploading}
          style={{
            flex: 1,
            backgroundColor: '#2563eb',
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: 'center',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
            {uploading ? '저장 중...' : editTarget ? '수정 완료' : '추가'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#4b5563', fontSize: 14 }}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}