/**
 * lib/api.ts — Fully-typed API client
 * All backend communication goes through this module.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Token management ────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("access_token");
}

// ── Base fetch wrapper ──────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API error");
  }

  return res.json() as Promise<T>;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  exam_target: string | null;
  exam_date: string | null;
  xp: number;
  streak_days: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
}

export interface Question {
  question_id: string;
  topic_id: string;
  topic_name: string;
  text: string;
  options: { id: string; text: string }[];
  difficulty: number;
}

export interface SubmitResponse {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  new_mastery: number;
  mastery_delta: number;
  xp_gained: number;
}

export interface PlanItem {
  topic_id: string;
  topic_name: string;
  subject: string;
  duration_min: number;
  session_type: string;
  priority: number;
  current_mastery: number;
  revision_due: boolean;
}

export interface HeatmapCell {
  topic_id: string;
  topic_name: string;
  subject: string;
  mastery: number;
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
  trend: number;
}

export interface Prediction {
  predicted_score: number;
  max_score: number;
  percentile: number;
  confidence_low: number;
  confidence_high: number;
  weak_topics: { id: string; name: string; mastery: number }[];
  strong_topics: { id: string; name: string; mastery: number }[];
  days_to_exam: number | null;
}

export interface MasteryTrend {
  date: string;
  avg_mastery: number;
  topics_covered: number;
}

export interface AttemptHistory {
  question_id: string;
  topic_name: string;
  correct: boolean;
  time_taken_sec: number;
  attempted_at: string;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  async register(data: {
    email: string;
    password: string;
    name: string;
    exam_target?: string;
    exam_date?: string;
  }): Promise<TokenResponse> {
    return apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) });
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    // OAuth2 form format
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
  },

  async me(): Promise<UserProfile> {
    return apiFetch("/auth/me");
  },
};

// ── Quiz ────────────────────────────────────────────────────────────────────

export const quiz = {
  async next(topicId: string): Promise<Question> {
    return apiFetch(`/quiz/next?topic_id=${topicId}`);
  },

  async submit(data: {
    question_id: string;
    answer: string;
    time_taken_sec: number;
    confidence?: number;
  }): Promise<SubmitResponse> {
    return apiFetch("/quiz/submit", { method: "POST", body: JSON.stringify(data) });
  },

  async history(limit = 20): Promise<AttemptHistory[]> {
    return apiFetch(`/quiz/history?limit=${limit}`);
  },
};

// ── Study Plan ──────────────────────────────────────────────────────────────

export const plan = {
  async today(hours = 4): Promise<PlanItem[]> {
    return apiFetch(`/plan/today?hours=${hours}`);
  },

  async complete(data: {
    topic_id: string;
    duration_min: number;
    session_type?: string;
  }): Promise<{ message: string; xp_gained: number }> {
    return apiFetch("/plan/complete", { method: "POST", body: JSON.stringify(data) });
  },

  async revisions() {
    return apiFetch("/plan/revisions");
  },
};

// ── Analytics ───────────────────────────────────────────────────────────────

export const analytics = {
  async heatmap(): Promise<HeatmapCell[]> {
    return apiFetch("/analytics/heatmap");
  },

  async predict(): Promise<Prediction> {
    return apiFetch("/analytics/predict");
  },

  async masteryTrend(days = 30): Promise<MasteryTrend[]> {
    return apiFetch(`/analytics/mastery-trend?days=${days}`);
  },
};

// ── Tutor (streaming) ───────────────────────────────────────────────────────

export function streamTutorAnswer(
  question: string,
  topicId?: string,
  topicName?: string,
  onChunk?: (chunk: string) => void,
  onDone?: () => void,
  onError?: (err: string) => void
): AbortController {
  const controller = new AbortController();
  const token = getToken();

  fetch(`${BASE}/tutor/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, topic_id: topicId, topic_name: topicName }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      onError?.("Failed to connect to tutor");
      return;
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone?.();
          } else if (data.startsWith("[ERROR]")) {
            onError?.(data.slice(8));
          } else if (data) {
            onChunk?.(data);
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") {
      onError?.(err.message);
    }
  });

  return controller;
}
