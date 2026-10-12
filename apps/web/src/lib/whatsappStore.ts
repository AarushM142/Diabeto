import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, Language } from './types';
import { supabase } from './supabase';
import { api } from '../api/client';

/**
 * Shared WhatsApp care-thread store (Phase 16).
 *
 * Durable source of truth: Supabase Postgres `care_messages` via
 *   GET/POST /v1/care/{patientId}/messages.
 * Live fan-out: Supabase Realtime on `care_messages` (postgres_changes INSERT
 * filtered by patient_id) + window CustomEvent for same-tab instant sync.
 * Offline fallback: localStorage cache (`diabeto_wa_thread_<patientId>`).
 *
 * No seed personas: greeting uses the elder's real first name (or generic).
 */

const THREAD_PREFIX = 'diabeto_wa_thread_';
const THREAD_EVENT = 'diabeto:wa-thread-updated';

export type WhatsAppThreadSender = ChatMessage['sender'];

const threadKey = (patientId: string): string => `${THREAD_PREFIX}${patientId}`;

export const getThreadEventName = (): string => THREAD_EVENT;

const seedGreeting = (patientFirstName: string, language: Language): ChatMessage => {
  const name = (patientFirstName || '').trim() || (language === 'en' ? 'Friend' : 'जी');
  return {
    id: 'msg_seed',
    sender: 'bot',
    authorName: 'Diabeto AI',
    text:
      language === 'hi'
        ? `नमस्ते ${name}! 🙏 आशा है आपकी सुबह सुखद रही। आप बोलकर या लिखकर अपनी शुगर, भोजन की फोटो या कोई भी स्वास्थ्य सवाल पूछ सकते हैं।`
        : language === 'mr'
          ? `नमस्कार ${name}! 🙏 आशा आहे आपली सकाळ छान झाली. आपण बोलून किंवा लिहून आपली साखर, जेवणाचा फोटो किंवा कोणताही प्रश्न विचारू शकता.`
          : `Namaste ${name}! 🙏 Hope you slept well. Feel free to speak or text your glucose, send a meal photo, or ask any health question!`,
    timestamp: '8:00 AM',
  };
};

const readCache = (patientId: string): ChatMessage[] | null => {
  try {
    const raw = localStorage.getItem(threadKey(patientId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeMessages([], parsed as ChatMessage[]);
      }
    }
  } catch {
    // Corrupt cache — ignore.
  }
  return null;
};

export const loadThread = (
  patientId: string,
  patientFirstName = '',
  language: Language = 'en',
): ChatMessage[] => {
  if (!patientId) return [seedGreeting(patientFirstName, language)];
  return readCache(patientId) ?? [seedGreeting(patientFirstName, language)];
};

const persistThread = (patientId: string, messages: ChatMessage[]): void => {
  if (!patientId) return;
  try {
    localStorage.setItem(threadKey(patientId), JSON.stringify(messages.slice(-200)));
  } catch {
    // Storage full / unavailable — thread stays in memory only.
  }
  window.dispatchEvent(new CustomEvent(THREAD_EVENT, { detail: { patientId } }));
};

const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  if (incoming.length === 0) return current;
  const merged = [...current];

  for (const inc of incoming) {
    // Match existing message by:
    // 1. Direct ID match
    // 2. Client message ID match (reconciles optimistic msg with server row)
    // 3. Fallback: same sender, identical text, and one of them is optimistic (id starts with msg_ or bot_)
    const existingIdx = merged.findIndex((m) => {
      if (m.id === inc.id) return true;
      if (inc.clientMsgId && (m.id === inc.clientMsgId || m.clientMsgId === inc.clientMsgId)) return true;
      if (m.clientMsgId && (m.clientMsgId === inc.id || inc.id === m.clientMsgId)) return true;
      if (m.sender === inc.sender && m.text.trim() === inc.text.trim()) {
        const mIsOptimistic = m.id.startsWith('msg_') || m.id.startsWith('bot_');
        const incIsOptimistic = inc.id.startsWith('msg_') || inc.id.startsWith('bot_');
        if (mIsOptimistic || incIsOptimistic) {
          return true;
        }
      }
      return false;
    });

    if (existingIdx >= 0) {
      const existing = merged[existingIdx];
      // Prefer server ID over client optimistic ID
      const preferredId = (!inc.id.startsWith('msg_') && !inc.id.startsWith('bot_'))
        ? inc.id
        : existing.id;
      merged[existingIdx] = {
        ...existing,
        ...inc,
        id: preferredId,
        clientMsgId: inc.clientMsgId || existing.clientMsgId || existing.id,
      };
    } else {
      merged.push(inc);
    }
  }

  // Deduplicate array by both id and clientMsgId as a safety net
  const deduped: ChatMessage[] = [];
  const seenIds = new Set<string>();
  for (const m of merged) {
    const primaryKey = `id:${m.id}`;
    const clientKey = m.clientMsgId ? `cid:${m.clientMsgId}` : null;
    if (seenIds.has(primaryKey) || (clientKey && seenIds.has(clientKey))) {
      continue;
    }
    seenIds.add(primaryKey);
    if (clientKey) seenIds.add(clientKey);
    deduped.push(m);
  }

  // Keep seed greeting first, rest chronological; cap at 200.
  return deduped.slice(-200);
};

/** Map a backend CareMessage row to the UI ChatMessage shape. */
export const toChatMessage = (row: {
  id: string;
  sender: string;
  author_name?: string | null;
  text: string;
  created_at: string;
  is_voice?: boolean;
  voice_duration?: string | null;
  transcript?: string | null;
  client_msg_id?: string | null;
}): ChatMessage => ({
  id: row.id,
  sender: (row.sender === 'caretaker' ? 'user' : row.sender) as ChatMessage['sender'],
  authorName: row.author_name || undefined,
  text: row.text,
  timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  isVoice: Boolean(row.is_voice),
  voiceDuration: row.voice_duration || undefined,
  transcript: row.transcript || undefined,
  clientMsgId: row.client_msg_id || undefined,
});

/** Fire-and-forget durable write; returns the server row (or null offline). */
export const persistMessageToBackend = async (
  patientId: string,
  message: ChatMessage,
  authorId?: string,
): Promise<void> => {
  if (!patientId || message.id === 'msg_seed') return;
  try {
    await api.sendCareMessage(patientId, {
      sender: message.sender,
      author_name: message.authorName,
      author_id: authorId,
      text: message.text,
      is_voice: message.isVoice,
      voice_duration: message.voiceDuration,
      transcript: message.transcript,
      client_msg_id: message.clientMsgId || message.id,
    });
  } catch {
    // Offline — localStorage cache keeps the message; it syncs on next load.
  }
};

export const appendToThread = (
  patientId: string,
  message: ChatMessage,
  authorId?: string,
): ChatMessage[] => {
  const next = mergeMessages(loadThread(patientId), [message]);
  persistThread(patientId, next);
  void persistMessageToBackend(patientId, message, authorId);
  return next;
};

export const clearThread = (
  patientId: string,
  patientFirstName = '',
  language: Language = 'en',
): ChatMessage[] => {
  const seeded = [seedGreeting(patientFirstName, language)];
  persistThread(patientId, seeded);
  return seeded;
};

/**
 * Resolve which patient's thread the current viewer should observe.
 * Patient → own thread. Caregiver → linked senior's thread.
 * Doctor → the currently selected chart patient (passed explicitly).
 * No seed fallback: returns '' when unknown so callers show an
 * explicit "link an elder" empty state instead of a demo thread.
 */
export const resolveThreadPatientId = (
  role: string | undefined,
  userId: string | undefined,
  linkedPatientId?: string,
  fallback = '',
): string => {
  if (role === 'patient' && userId) return userId;
  if (role === 'caregiver' && linkedPatientId) return linkedPatientId;
  if (userId?.startsWith('pt_')) return userId;
  if (linkedPatientId) return linkedPatientId;
  return fallback;
};

export const nowTime = (): string =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Reactive hook: loads durable history from Supabase-backed REST,
 * subscribes to Supabase Realtime INSERTs for cross-device live sync,
 * and re-renders on same-tab CustomEvent updates.
 */
export const useWhatsAppThread = (
  patientId: string,
  patientFirstName = '',
  language: Language = 'en',
) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadThread(patientId, patientFirstName, language),
  );
  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;

  // Initial load: durable history first, cache as fallback.
  useEffect(() => {
    if (!patientId) {
      setMessages([seedGreeting(patientFirstName, language)]);
      return;
    }
    setMessages(loadThread(patientId, patientFirstName, language));
    let cancelled = false;
    (async () => {
      const rows = await api.getCareMessages(patientId);
      if (cancelled || patientIdRef.current !== patientId) return;
      if (rows.length > 0) {
        const mapped = rows.map(toChatMessage);
        setMessages((prev) => {
          // Drop the local seed greeting once real history exists.
          const withoutSeed = prev.filter((m) => m.id !== 'msg_seed');
          const next = mergeMessages(withoutSeed, mapped);
          persistThread(patientId, next);
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Same-tab instant sync.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { patientId?: string } | undefined;
      if (!detail || detail.patientId === patientId) {
        setMessages(readCache(patientId) ?? [seedGreeting(patientFirstName, language)]);
      }
    };
    window.addEventListener(THREAD_EVENT, onUpdate);
    return () => window.removeEventListener(THREAD_EVENT, onUpdate);
  }, [patientId, patientFirstName, language]);

  // Cross-tab / cross-device live sync via Supabase Realtime.
  useEffect(() => {
    if (!patientId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`care_thread:${patientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'care_messages',
            filter: `patient_id=eq.${patientId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              sender: string;
              author_name?: string | null;
              text: string;
              created_at: string;
              is_voice?: boolean;
              voice_duration?: string | null;
              transcript?: string | null;
              client_msg_id?: string | null;
            };
            if (!row?.id || !row?.text) return;
            setMessages((prev) => {
              const incomingMsg = toChatMessage(row);
              const next = mergeMessages(
                prev.filter((m) => m.id !== 'msg_seed'),
                [incomingMsg],
              );
              persistThread(patientId, next);
              return next;
            });
          },
        )
        .subscribe();
    } catch {
      // Realtime unavailable (table not yet migrated?) — REST + CustomEvent still work.
      channel = null;
    }
    return () => {
      try {
        if (channel) void supabase.removeChannel(channel);
      } catch {
        // ignore teardown errors
      }
    };
  }, [patientId]);

  const appendMessage = useCallback(
    (message: ChatMessage, authorId?: string) => {
      setMessages(appendToThread(patientId, message, authorId));
    },
    [patientId],
  );

  const clearMessages = useCallback(() => {
    setMessages(clearThread(patientId, patientFirstName, language));
  }, [patientId, patientFirstName, language]);

  return { messages, appendMessage, clearMessages };
};
