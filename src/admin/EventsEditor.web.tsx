// src/admin/EventsEditor.web.tsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ImageCropper } from '@/components/ImageCropper';
import type { EventFormState, EventRow } from './useEventForm';

export type EventsEditorProps = {
  form: EventFormState;
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>;
  imageUrls: string[]; // 기존 DB에 저장된 URL들
  setImageUrls: (urls: string[]) => void; // 지금은 안 써도 됨 (호환용)
  uploading: boolean;
  editTarget: EventRow | null;
  onSave: (args: { imageUrls: string[] }) => Promise<void>; // 최종 URL 배열만 넘김
  onCancel: () => void;
};

// ─── Rich Text Editor (contentEditable + 색상) ────────────────────────────────

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
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50 flex-wrap">
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
      <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:#9ca3af}`}</style>
    </div>
  );
}

// ─── Image Upload Panel ───────────────────────────────────────────────────────

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

// ─── Supabase Storage helper ─────────────────────────────────────────────────

async function uploadToEventImagesBucket(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('event-images')
    .upload(fileName, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── EventsEditor.web (PWA용 리치 에디터 + 이미지 업로드) ────────────────────

const EventsEditor: React.FC<EventsEditorProps> = ({
  form,
  setForm,
  imageUrls,
  // setImageUrls,
  uploading,
  editTarget,
  onSave,
  onCancel,
}) => {
  // 기존 서버에 이미 저장된 이미지 URL들 (로컬 상태로 복사)
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  // 새로 추가된 이미지 파일들
  const [newFiles, setNewFiles] = useState<File[]>([]);
  // 특정 URL에 대한 크롭(교체) 대기 중인 파일들
  const [pendingReplacements, setPendingReplacements] = useState<PendingReplacement[]>([]);
  // 리치 에디터 강제 리셋용
  const [richEditorKey, setRichEditorKey] = useState(0);

  // editTarget 또는 imageUrls 변경 시 로컬 상태 초기화
  useEffect(() => {
    const base =
      (imageUrls && imageUrls.length > 0 ? imageUrls : editTarget?.image_urls) || [];
    setExistingUrls(base);
    setNewFiles([]);
    setPendingReplacements([]);
    setRichEditorKey((k) => k + 1);
  }, [editTarget?.id, imageUrls.join('|')]);

  // ── 이미지 핸들러들 ──────────────────────────────────────────────────────────

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
      await supabase.storage.from('event-images').remove([fileName]);
    }

    setPendingReplacements((prev) => prev.filter((p) => p.originalUrl !== url));
    setExistingUrls((prev) => prev.filter((u) => u !== url));
  };

  const handlePendingReplace = (originalUrl: string, file: File, previewUrl: string) => {
    setPendingReplacements((prev) => {
      const without = prev.filter((p) => p.originalUrl !== originalUrl);
      return [...without, { originalUrl, file, previewUrl }];
    });
  };

  const handleReorderImages = (urls: string[]) => {
    setExistingUrls(urls);
  };

  // ── onSave 포워딩: Storage 업로드 후 최종 URL 배열 넘김 ───────────────────────

  const handleSubmit = async () => {
    try {
      const finalUrls: string[] = [];

      // 1) 기존 이미지들 + 크롭 교체 반영
      for (const url of existingUrls) {
        const pending = pendingReplacements.find((p) => p.originalUrl === url);
        if (!pending) {
          finalUrls.push(url);
          continue;
        }

        const oldName = url.split('/').pop();
        if (oldName) {
          await supabase.storage.from('event-images').remove([oldName]);
        }

        const newUrl = await uploadToEventImagesBucket(pending.file);
        finalUrls.push(newUrl);
      }

      // 2) 새로 추가된 파일 업로드
      for (const file of newFiles) {
        const newUrl = await uploadToEventImagesBucket(file);
        finalUrls.push(newUrl);
      }

      // 3) useEventForm 쪽으로 최종 URL 배열 전달 → DB insert/update 처리
      await onSave({ imageUrls: finalUrls });

      setExistingUrls(finalUrls);
      setNewFiles([]);
      setPendingReplacements([]);
      setRichEditorKey((k) => k + 1);
    } catch (err: any) {
      alert('이미지 업로드 중 오류가 발생했습니다: ' + (err?.message || String(err)));
    }
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 mt-4 shadow-sm">
        <h3 className="font-medium text-gray-900">
          {editTarget ? '이벤트 수정' : '새 이벤트'}
        </h3>

        <input
          placeholder="이벤트 제목"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <div>
          <label className="text-sm text-gray-500 block mb-1">내용</label>
          <RichEditor
            key={richEditorKey}
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="내용을 입력하세요"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm text-gray-500 block mb-1">장소</label>
          <RichEditor
            key={richEditorKey + 50}
            value={form.location}
            onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            placeholder="장소를 입력하세요"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-sm text-gray-500 block mb-1">날짜</label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventDate: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">
              시간 (HH:MM)
            </label>
            <input
              type="text"
              placeholder="18:00"
              value={form.eventTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventTime: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <input
          placeholder="인스타그램 URL (선택)"
          value={form.instagram_url}
          onChange={(e) =>
            setForm((f) => ({ ...f, instagram_url: e.target.value }))
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <div>
          <label className="text-sm text-gray-500 block mb-1">사진</label>
          <ImageUploadPanel
            existingUrls={existingUrls}
            pendingReplacements={pendingReplacements}
            onAddFile={handleAddFile}
            onAddCropped={handleAddCropped}
            onRemoveNew={handleRemoveNew}
            onRemoveExisting={handleRemoveExisting}
            onPendingReplace={handlePendingReplace}
            onReorder={handleReorderImages}
          />
        </div>

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
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventsEditor;