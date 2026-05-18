// src/admin/useEventForm.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export type EventFormState = {
  title: string;
  description: string;
  eventDate: string;   // YYYY-MM-DD
  eventTime: string;   // HH:MM
  location: string;
  instagram_url: string;
};

export type EventRow = {
  id: number;
  title: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  instagram_url?: string | null;
  image_urls?: string[] | null;
  is_archived?: boolean | null;
};

// ─── Helpers (기존 admin.jsx 로직과 동일) ───────────────────────────────────────

function toLocalDateString(isoString?: string | null): string {
  if (!isoString) return '';
  return String(isoString).slice(0, 10);
}

function toLocalTimeString(isoString?: string | null): string {
  if (!isoString) return '';
  const s = String(isoString);
  if (s.includes('+') || s.endsWith('Z')) {
    const d = new Date(s);
    return `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
  }
  return s.length >= 16 ? s.slice(11, 16) : '';
}

function combineDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  const time = timeStr || '00:00';
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const local = new Date(y, mo - 1, d, h, mi, 0);
  return local.toISOString();
}

const EMPTY_FORM: EventFormState = {
  title: '',
  description: '',
  eventDate: '',
  eventTime: '',
  location: '',
  instagram_url: '',
};

export interface UseEventFormResult {
  events: EventRow[];
  archivedEvents: EventRow[];
  showForm: boolean;
  showArchived: boolean;
  form: EventFormState;
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>;
  imageUrls: string[];
  setImageUrls: (urls: string[]) => void;
  uploading: boolean;
  editTarget: EventRow | null;

  setShowArchived: (v: boolean) => void;
  openAdd: () => void;
  openEdit: (ev: EventRow) => void;
  resetForm: () => void;

  handleSave: (args: { imageUrls: string[] }) => Promise<void>;
  handleDelete: (id: number) => void;
  handleArchive: (id: number) => void;
  handleRestore: (id: number) => void;
}

export function useEventForm(): UseEventFormResult {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<EventRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editTarget, setEditTarget] = useState<EventRow | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  // 공통: URL만 관리 (실제 파일 업로드는 에디터에게 위임)
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_archived', false)
      .order('event_date', { ascending: true });

    setEvents((data || []) as EventRow[]);
  }, []);

  const fetchArchived = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_archived', true)
      .order('event_date', { ascending: false });

    setArchivedEvents((data || []) as EventRow[]);
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchArchived();
  }, [fetchEvents, fetchArchived]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageUrls(editTarget?.image_urls || []);
    setShowForm(false);
    setEditTarget(null);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setImageUrls([]);
    setShowForm(true);
  };

  const openEdit = (ev: EventRow) => {
    setEditTarget(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      eventDate: toLocalDateString(ev.event_date),
      eventTime: toLocalTimeString(ev.event_date),
      location: ev.location || '',
      instagram_url: ev.instagram_url || '',
    });
    setImageUrls(ev.image_urls || []);
    setShowForm(true);
  };

  const handleSave = async ({ imageUrls: finalImageUrls }: { imageUrls: string[] }) => {
    if (!form.title) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }

    setUploading(true);

    const payload = {
      title: form.title,
      description: form.description,
      event_date: combineDateTime(form.eventDate, form.eventTime),
      location: form.location,
      instagram_url: form.instagram_url,
      image_urls: finalImageUrls ?? imageUrls ?? [],
    };

    if (editTarget) {
      await supabase.from('events').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('events').insert(payload);
    }

    setUploading(false);
    resetForm();
    fetchEvents();
    fetchArchived();
  };

  const handleDelete = (id: number) => {
    Alert.alert('삭제', '삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('events').delete().eq('id', id);
          fetchEvents();
          fetchArchived();
        },
      },
    ]);
  };

  const handleArchive = async (id: number) => {
    await supabase.from('events').update({ is_archived: true }).eq('id', id);
    fetchEvents();
    fetchArchived();
  };

  const handleRestore = async (id: number) => {
    await supabase.from('events').update({ is_archived: false }).eq('id', id);
    fetchEvents();
    fetchArchived();
  };

  return {
    events,
    archivedEvents,
    showForm,
    showArchived,
    form,
    setForm,
    imageUrls,
    setImageUrls,
    uploading,
    editTarget,

    setShowArchived,
    openAdd,
    openEdit,
    resetForm,

    handleSave,
    handleDelete,
    handleArchive,
    handleRestore,
  };
}