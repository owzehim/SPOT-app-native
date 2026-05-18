// src/admin/RestaurantsEditor.native.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';

// 장소 카테고리 (기존 SPOT_CATEGORIES와 동일)
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

type RestaurantsEditorProps = {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  editTarget: any;
  uploading: boolean;

  imagePreviews: any[];
  setImagePreviews: React.Dispatch<React.SetStateAction<any[]>>;

  pendingReplacements: any[];
  setPendingReplacements: React.Dispatch<React.SetStateAction<any[]>>;

  handleAddImage: () => void;
  handleCropImage: (idx: number, isExisting: boolean) => void;
  handleRemoveImage: (idx: number, isExisting: boolean) => void;
  handleSave: () => void;
  resetForm: () => void;

  // 웹에서만 사용할 prop (native는 무시)
  onSave?: (args: { imageUrls: string[] }) => Promise<void>;
};

// 이 파일 안에서만 쓰는 Field (admin.jsx의 Field와 동일 모양)
function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
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

const RestaurantsEditor: React.FC<RestaurantsEditorProps> = ({
  form,
  setForm,
  editTarget,
  uploading,
  imagePreviews,
  pendingReplacements,
  handleAddImage,
  handleCropImage,
  handleRemoveImage,
  handleSave,
  resetForm,
}) => {
  return (
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
        {editTarget ? '장소 수정' : '새 장소 추가'}
      </Text>

      <Field
        label="장소 이름 *"
        value={form.name}
        onChange={(v) => setForm((f: any) => ({ ...f, name: v }))}
        placeholder="장소 이름"
      />

      <Field
        label="지도 표시 이름"
        value={form.map_label}
        onChange={(v) => setForm((f: any) => ({ ...f, map_label: v }))}
        placeholder="지도 표시 이름"
      />

      <Field
        label="주소"
        value={form.address}
        onChange={(v) => setForm((f: any) => ({ ...f, address: v }))}
        placeholder="주소"
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="위도"
            value={form.latitude}
            onChange={(v) => setForm((f: any) => ({ ...f, latitude: v }))}
            placeholder="52.3676"
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="경도"
            value={form.longitude}
            onChange={(v) => setForm((f: any) => ({ ...f, longitude: v }))}
            placeholder="4.9041"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Field
        label="할인 정보"
        value={form.discount_info}
        onChange={(v) => setForm((f: any) => ({ ...f, discount_info: v }))}
        placeholder="10% 할인"
      />

      <Field
        label="할인 조건"
        value={form.discount_terms}
        onChange={(v) => setForm((f: any) => ({ ...f, discount_terms: v }))}
        placeholder="주말 제외"
      />

      <Field
        label="설명"
        value={form.description}
        onChange={(v) => setForm((f: any) => ({ ...f, description: v }))}
        placeholder="설명"
        multiline
      />

      <Field
        label="평점 (0~5)"
        value={form.rating}
        onChange={(v) => setForm((f: any) => ({ ...f, rating: v }))}
        placeholder="4.5"
        keyboardType="numeric"
      />

      <Field
        label="리뷰어 이름"
        value={form.reviewer_name}
        onChange={(v) => setForm((f: any) => ({ ...f, reviewer_name: v }))}
        placeholder="리뷰어 이름"
      />

      <Field
        label="리뷰"
        value={form.review}
        onChange={(v) => setForm((f: any) => ({ ...f, review: v }))}
        placeholder="리뷰 내용"
        multiline
      />

      {/* 카테고리 선택 버튼 */}
      <View>
        <Text
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 4,
          }}
        >
          카테고리
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {SPOT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() =>
                setForm((f: any) => ({
                  ...f,
                  category: cat,
                }))
              }
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor:
                  form.category === cat ? '#2563eb' : '#f3f4f6',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: form.category === cat ? 'white' : '#4b5563',
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 가격대 버튼 */}
      <View>
        <Text
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 4,
          }}
        >
          가격대
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['€', '€€', '€€€', '€€€€'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() =>
                setForm((f: any) => ({
                  ...f,
                  price_range: p,
                }))
              }
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor:
                  form.price_range === p ? '#2563eb' : '#f3f4f6',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: form.price_range === p ? 'white' : '#4b5563',
                }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 제휴/스폰서 토글 */}
      <TouchableOpacity
        onPress={() =>
          setForm((f: any) => ({
            ...f,
            is_sponsored: !f.is_sponsored,
          }))
        }
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: form.is_sponsored ? '#f97316' : '#d1d5db',
            backgroundColor: form.is_sponsored ? '#f97316' : 'white',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {form.is_sponsored && (
            <Text
              style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              ✓
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 14, color: '#374151' }}>제휴/스폰서</Text>
      </TouchableOpacity>

      {/* 이미지 섹션 (기존 RestaurantForm 그대로) */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 12,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#111827',
            marginBottom: 8,
          }}
        >
          사진
        </Text>

        {/* 기존 이미지 */}
        {form.image_urls && form.image_urls.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 11,
                color: '#6b7280',
                marginBottom: 8,
              }}
            >
              기존 사진 ({form.image_urls.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {form.image_urls.map((url: string, idx: number) => {
                  const pending = pendingReplacements.find(
                    (p: any) => p.idx === idx,
                  );
                  const displayUrl = pending ? pending.previewUrl : url;

                  return (
                    <View
                      key={`place-existing-${idx}`}
                      style={{ position: 'relative' }}
                    >
                      <TouchableOpacity
                        onPress={() => handleCropImage(idx, true)}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: 2,
                          borderColor: '#e5e7eb',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        {displayUrl ? (
                          <Image
                            source={{ uri: displayUrl }}
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <Text
                            style={{
                              fontSize: 10,
                              color: '#9ca3af',
                            }}
                          >
                            ✂️
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemoveImage(idx, true)}
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#ef4444',
                          borderRadius: 999,
                          width: 24,
                          height: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 새 이미지 프리뷰 */}
        {imagePreviews.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 11,
                color: '#6b7280',
                marginBottom: 8,
              }}
            >
              새 사진 ({imagePreviews.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {imagePreviews.map((preview, idx) => (
                  <View
                    key={`place-new-${idx}`}
                    style={{ position: 'relative' }}
                  >
                    <TouchableOpacity
                      onPress={() => handleCropImage(idx, false)}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: '#3b82f6',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#eff6ff',
                      }}
                    >
                      <Image
                        source={{ uri: preview.uri }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemoveImage(idx, false)}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: '#ef4444',
                        borderRadius: 999,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 업로드 버튼 */}
        <TouchableOpacity
          onPress={handleAddImage}
          style={{
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: '#3b82f6',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
            backgroundColor: '#eff6ff',
          }}
        >
          <Text
            style={{
              color: '#3b82f6',
              fontSize: 13,
              fontWeight: '500',
            }}
          >
            📁 사진 추가
          </Text>
          <Text
            style={{
              color: '#9ca3af',
              fontSize: 11,
              marginTop: 4,
            }}
          >
            탭하여 선택 또는 자르기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 저장 / 취소 버튼 */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={uploading}
          style={{
            flex: 1,
            backgroundColor: uploading ? '#9ca3af' : '#2563eb',
            borderRadius: 8,
            paddingVertical: 12,
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
            {uploading ? '업로드 중...' : editTarget ? '수정 완료' : '추가'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={resetForm}
          style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#4b5563', fontSize: 14 }}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RestaurantsEditor;