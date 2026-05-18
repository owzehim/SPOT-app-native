// src/admin/RestaurantsEditor.web.tsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ImageCropper } from '@/components/ImageCropper';

// 네이티브/웹 공통 props 시그니처 유지
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

  // RestaurantsTab에서 내려오는 저장 함수
  handleSave: (override?: { imageUrls?: string[] }) => Promise<void> | void;
  resetForm: () => void;
};

// 리치 텍스트 색상 팔레트
const COLORS = [
  '#000000',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
];

// ─── 리치 텍스트 (간단 버전: 굵게 / 이탤릭 / 리스트) ─────────────────────────────

type RichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
};

function RichEditor({ value, onChange, placeholder, rows = 3 }: RichEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showColors, setShowColors] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (ref.current && !isInitialized.current) {
      ref.current.innerHTML = value || '';
      isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (ref.current && value === '') {
      ref.current.innerHTML = '';
    }
  }, [value]);

  const exec = (cmd: string, val: string | null = null) => {
    if (!ref.current) return;
    ref.current.focus();
    // 브라우저 기본 rich-text 명령 사용
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(cmd, false, val);
    onChange(ref.current.innerHTML);
  };

  const handleInput = () => {
    if (!ref.current) return;
    onChange(ref.current.innerHTML);
  };

  const applyColor = (color: string) => {
    exec('foreColor', color);
    setShowColors(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-visible">
      {/* 툴바 */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50 flex-wrap">
        {/* 굵게 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('bold');
          }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded font-bold hover:bg-gray-100"
        >
          B
        </button>

        {/* 이탤릭 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('italic');
          }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded italic hover:bg-gray-100"
        >
          I
        </button>

        {/* 불릿 리스트 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('insertUnorderedList');
          }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
        >
          •
        </button>

        {/* 색상 팔레트 버튼 */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColors((v) => !v);
            }}
            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
          >
            🎨
          </button>

          {showColors && (
            <div
              className="absolute top-7 left-0 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-lg flex gap-1 flex-wrap"
              style={{ width: '120px' }}
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyColor(c);
                  }}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 포맷 제거 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('removeFormat');
          }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-500"
        >
          ✕
        </button>
      </div>

      {/* 편집 영역 */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm outline-none"
        style={{
          minHeight: `${rows * 1.5}rem`,
          whiteSpace: 'pre-wrap',
          overflowY: 'auto',
          direction: 'ltr',
          unicodeBidi: 'plaintext',
        }}
      />
      <style>
        {`[contenteditable]:empty:before{content:attr(data-placeholder);color:#9ca3af}`}
      </style>
    </div>
  );
}

// ─── 이미지 업로드 패널 (이벤트 탭 코드 그대로, 단 place-images용) ───────────────

type PendingReplacement = {
  originalUrl: string;
  file: File;
  previewUrl: string;
};

type ImageUploadPanelProps = {
  existingUrls: string[];
  pendingReplacements: PendingReplacement[];
  onAddFile: (file: File) => void;
  onAddCropped: (file: File) => void;
  onRemoveNew: (index: number) => void;
  onRemoveExisting: (url: string) => void;
  onPendingReplace: (originalUrl: string, file: File, previewUrl: string) => void;
  onReorder: (urls: string[]) => void;
};

function ImageUploadPanel({
  existingUrls,
  pendingReplacements,
  onAddFile,
  onAddCropped,
  onRemoveNew,
  onRemoveExisting,
  onPendingReplace,
  onReorder,
}: ImageUploadPanelProps) {
  const [cropperSource, setCropperSource] = useState<
    | { type: 'file'; file: File }
    | { type: 'url'; url: string }
    | null
  >(null);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const dragIndexRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((f) => {
      onAddFile(f);
      setNewPreviews((prev) => [...prev, URL.createObjectURL(f)]);
    });
    e.target.value = '';
  };

  const handleFileSelectForCrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCropperSource({ type: 'file', file: e.target.files[0] });
    }
    e.target.value = '';
  };

  const handleTapExisting = (url: string) => {
    setCropperSource({ type: 'url', url });
  };

  const handleCropDone = (croppedFile: File) => {
    if (cropperSource?.type === 'url') {
      const previewUrl = URL.createObjectURL(croppedFile);
      onPendingReplace(cropperSource.url, croppedFile, previewUrl);
    } else {
      onAddCropped(croppedFile);
      setNewPreviews((prev) => [...prev, URL.createObjectURL(croppedFile)]);
    }
    setCropperSource(null);
  };

  const handleRemoveNewLocal = (idx: number) => {
    onRemoveNew(idx);
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => {
    dragIndexRef.current = idx;
  };

  const handleDrop = (idx: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === idx) return;
    const reordered = [...existingUrls];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    dragIndexRef.current = null;
  };

  const getDisplayUrl = (url: string) => {
    const pending = pendingReplacements.find((p) => p.originalUrl === url);
    return pending ? pending.previewUrl : url;
  };

  return (
    <div className="space-y-3">
      {(existingUrls.length > 0 || newPreviews.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {existingUrls.map((url, idx) => (
            <div
              key={`ex-${url}-${idx}`}
              className="relative group cursor-grab"
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
            >
              <img
                src={getDisplayUrl(url)}
                alt=""
                onClick={() => handleTapExisting(url)}
                className="w-20 h-20 object-contain rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors pointer-events-none flex items-center justify-center">
                <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 drop-shadow">
                  ✂️
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveExisting(url)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-10"
              >
                ✕
              </button>
            </div>
          ))}

          {newPreviews.map((preview, idx) => (
            <div key={`new-${idx}`} className="relative">
              <img
                src={preview}
                alt=""
                className="w-20 h-20 object-contain rounded-lg border-2 border-blue-200 bg-gray-50"
              />
              <button
                type="button"
                onClick={() => handleRemoveNewLocal(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {existingUrls.length > 0 && (
        <p className="text-xs text-gray-400">
          💡 기존 사진을 탭하면 자를 수 있어요 · 드래그로 순서 변경
        </p>
      )}

      <div className="flex gap-2">
        {/* 그냥 업로드 */}
        <label className="flex-1 cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-lg px-3 py-3 text-center hover:border-gray-400 transition-colors">
            <p className="text-xs font-medium text-gray-600">📁 그냥 업로드</p>
            <p className="text-xs text-gray-400 mt-0.5">자르기 없이</p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>

        {/* 자르기 업로드 */}
        <label className="flex-1 cursor-pointer">
          <div className="border-2 border-dashed border-blue-300 rounded-lg px-3 py-3 text-center hover:border-blue-400 transition-colors">
            <p className="text-xs font-medium text-blue-600">✂️ 자르기 업로드</p>
            <p className="text-xs text-gray-400 mt-0.5">비율 선택 후 자르기</p>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelectForCrop}
          />
        </label>
      </div>

      {cropperSource && (
        <ImageCropper
          file={cropperSource.type === 'file' ? cropperSource.file : null}
          imageUrl={cropperSource.type === 'url' ? cropperSource.url : null}
          onCrop={handleCropDone}
          onCancel={() => setCropperSource(null)}
          aspectRatios={['1:1', '4:5']}
        />
      )}
    </div>
  );
}

// ─── Storage helper (place-images) ───────────────────────────────────────────

async function uploadToPlaceImagesBucket(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('place-images')
    .upload(fileName, file);
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('place-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── 메인: RestaurantsEditor.web ─────────────────────────────────────────────

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
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [pendingReplacements, setPendingReplacements] = useState<
    PendingReplacement[]
  >([]);
  const [richKey, setRichKey] = useState(0);

  useEffect(() => {
    const base =
      (form.image_urls && form.image_urls.length > 0
        ? form.image_urls
        : editTarget?.image_urls) || [];
    setExistingUrls(base);
    setNewFiles([]);
    setPendingReplacements([]);
    setRichKey((k) => k + 1);
  }, [editTarget?.id, (form.image_urls || []).join('|')]);

  // 이미지 핸들러
  const handleAddFile = (file: File) => {
    setNewFiles((prev) => [...prev, file]);
  };

  const handleAddCropped = (file: File) => {
    setNewFiles((prev) => [...prev, file]);
  };

  const handleRemoveNew = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExisting = async (url: string) => {
    if (!window.confirm('이 사진을 삭제할까요?')) return;
    const fileName = url.split('/').pop();
    if (fileName) {
      await supabase.storage.from('place-images').remove([fileName]);
    }
    setPendingReplacements((prev) =>
      prev.filter((p) => p.originalUrl !== url),
    );
    setExistingUrls((prev) => prev.filter((u) => u !== url));
  };

  const handlePendingReplace = (
    originalUrl: string,
    file: File,
    previewUrl: string,
  ) => {
    setPendingReplacements((prev) => {
      const without = prev.filter((p) => p.originalUrl !== originalUrl);
      return [...without, { originalUrl, file, previewUrl }];
    });
  };

  const handleReorder = (urls: string[]) => {
    setExistingUrls(urls);
  };

  // 최종 저장: Storage에 업로드 후 RestaurantsTab.handleSave 로 넘김
  const handleSubmit = async () => {
    try {
      const finalUrls: string[] = [];

      // 기존 + 교체 적용
      for (const url of existingUrls) {
        const pending = pendingReplacements.find(
          (p) => p.originalUrl === url,
        );
        if (!pending) {
          finalUrls.push(url);
          continue;
        }

        const oldName = url.split('/').pop();
        if (oldName) {
          await supabase.storage.from('place-images').remove([oldName]);
        }

        const newUrl = await uploadToPlaceImagesBucket(pending.file);
        finalUrls.push(newUrl);
      }

      // 새 파일 업로드
      for (const file of newFiles) {
        const newUrl = await uploadToPlaceImagesBucket(file);
        finalUrls.push(newUrl);
      }

      await handleSave({ imageUrls: finalUrls });

      setExistingUrls(finalUrls);
      setNewFiles([]);
      setPendingReplacements([]);
      setRichKey((k) => k + 1);
    } catch (err: any) {
      alert(
        '이미지 업로드 중 오류가 발생했습니다: ' +
          (err?.message || String(err)),
      );
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 mt-4 shadow-sm">
        <h3 className="font-medium text-gray-900">
          {editTarget ? '장소 수정' : '새 장소'}
        </h3>

        {/* 이름 / 지도표시 이름 / 주소 */}
        <input
          placeholder="장소 이름 *"
          value={form.name}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, name: e.target.value }))
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <input
          placeholder="지도 표시 이름"
          value={form.map_label}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, map_label: e.target.value }))
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <input
          placeholder="주소"
          value={form.address}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, address: e.target.value }))
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        {/* 위도 / 경도 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">위도</label>
            <input
              placeholder="52.3676"
              value={form.latitude}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, latitude: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">경도</label>
            <input
              placeholder="4.9041"
              value={form.longitude}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, longitude: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* 할인 정보 / 조건: RichEditor */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            할인 정보
          </label>
          <RichEditor
            key={richKey}
            value={form.discount_info}
            onChange={(v) =>
              setForm((f: any) => ({ ...f, discount_info: v }))
            }
            placeholder="예) 전체 메뉴 10% 할인"
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            할인 조건
          </label>
          <RichEditor
            key={richKey + 50}
            value={form.discount_terms}
            onChange={(v) =>
              setForm((f: any) => ({ ...f, discount_terms: v }))
            }
            placeholder="예) 주말 제외, 학생증 지참 등"
            rows={2}
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f: any) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* 평점 / 가격대 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              평점 (0~5)
            </label>
            <input
              placeholder="4.5"
              value={form.rating}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, rating: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              가격대
            </label>
            <div className="flex gap-2">
              {['€', '€€', '€€€', '€€€€'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setForm((f: any) => ({ ...f, price_range: p }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    form.price_range === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 카테고리 버튼 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {SPOT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setForm((f: any) => ({ ...f, category: cat }))
                }
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  form.category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 제휴/스폰서 */}
        <button
          type="button"
          onClick={() =>
            setForm((f: any) => ({ ...f, is_sponsored: !f.is_sponsored }))
          }
          className="flex items-center gap-2 text-sm text-gray-700"
        >
          <span
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              form.is_sponsored
                ? 'border-orange-500 bg-orange-500'
                : 'border-gray-300 bg-white'
            }`}
          >
            {form.is_sponsored && (
              <span className="text-white text-xs font-bold">✓</span>
            )}
          </span>
          <span>제휴/스폰서</span>
        </button>

        {/* 리뷰어 / 리뷰 */}
        <input
          placeholder="리뷰어 이름"
          value={form.reviewer_name}
          onChange={(e) =>
            setForm((f: any) => ({
              ...f,
              reviewer_name: e.target.value,
            }))
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          placeholder="리뷰"
          value={form.review}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, review: e.target.value }))
          }
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
        />

        {/* 사진 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">사진</label>
          <ImageUploadPanel
            existingUrls={existingUrls}
            pendingReplacements={pendingReplacements}
            onAddFile={handleAddFile}
            onAddCropped={handleAddCropped}
            onRemoveNew={handleRemoveNew}
            onRemoveExisting={handleRemoveExisting}
            onPendingReplace={handlePendingReplace}
            onReorder={handleReorder}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? '업로드 중...' : editTarget ? '수정 완료' : '추가'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantsEditor;