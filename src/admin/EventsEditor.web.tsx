// src/admin/EventsEditor.web.tsx
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

export default function EventsEditor(props: EventsEditorProps) {
  // 지금은 native 버전과 거의 동일한 간단 폼.
  // react-native-web 덕분에 TextInput, View 등을 그대로 써도 웹에서 동작합니다.
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        marginTop: 12,
        gap: 10,
      }}
    >
      <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>
        {props.editTarget ? '이벤트 수정 (웹 stub)' : '새 이벤트 (웹 stub)'}
      </Text>
      {/* 이하 내용은 native 버전과 동일하게 복사해도 됩니다. */}
      {/* TODO: 여기를 PWA의 RichEditor + ImageCropper 기반으로 교체할 예정 */}
      {/* … 필요시 native 버전과 완전히 동일한 구현을 붙이셔도 됨 */}
      {/* 간단히 재사용을 위해 native 컴포넌트를 재사용하는 방법도 가능하지만,
          지금은 독립 구현으로 두겠습니다. */}
      {/* 실제 코드에서는 native.tsx의 구현을 복붙하시면 됩니다. */}
    </View>
  );
}