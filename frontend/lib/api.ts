/**
 * lib/api.ts — Elite typed API client
 * Full support for: JEE · NEET · GATE · UPSC · CAT · GMAT · GRE · Semester
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Token management ──────────────────────────────────────────────────────────

export const token = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem("le_token") : null),
  set: (t: string) => localStorage.setItem("le_token", t),
  clear: () => localStorage.removeItem("le_token"),
};

// ── Base fetch ────────────────────────────────────────────────────────────────

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = token.get();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExamTarget =
  | "JEE" | "NEET" | "GATE" | "UPSC" | "CAT" | "GMAT" | "GRE" | "semester";

export const EXAM_CONFIG: Record<ExamTarget, {
  label: string; maxScore: number; subjects: string[];
  icon: string; color: string;
}> = {
  JEE:      { label: "JEE Mains + Advanced", maxScore: 360,  subjects: ["Physics","Chemistry","Mathematics"],               icon: "⚛️",  color: "#00ff88" },
  NEET:     { label: "NEET UG",              maxScore: 720,  subjects: ["Physics","Chemistry","Biology","Botany","Zoology"],  icon: "🧬",  color: "#f59e0b" },
  GATE:     { label: "GATE",                 maxScore: 100,  subjects: ["Engineering Mathematics","General Aptitude","Core Subject"], icon: "⚙️",  color: "#7c3aed" },
  UPSC:     { label: "UPSC Civil Services",  maxScore: 2025, subjects: ["History","Geography","Polity","Economy","Science & Tech","Environment","Current Affairs"], icon: "🏛️",  color: "#2196f3" },
  CAT:      { label: "CAT",                  maxScore: 300,  subjects: ["Verbal Ability","Data Interpretation","Quantitative Aptitude","Logical Reasoning"], icon: "📊",  color: "#ff4757" },
  GMAT:     { label: "GMAT",                 maxScore: 800,  subjects: ["Verbal","Quantitative","Integrated Reasoning","Analytical Writing"], icon: "📈",  color: "#ffd32a" },
  GRE:      { label: "GRE",                  maxScore: 340,  subjects: ["Verbal Reasoning","Quantitative Reasoning","Analytical Writing"], icon: "🎓",  color: "#00b4d8" },
  semester: { label: "University Semester",  maxScore: 100,  subjects: ["Core Subjects","Electives","Labs"],                 icon: "📚",  color: "#9b59b6" },
};

export interface UserProfile {
  id: string; email: string; name: string;
  exam_target: ExamTarget | null; exam_date: string | null;
  xp: number; streak_days: number; level: number; level_title: string;
  study_hours_today: number; weekly_goal_hours: number;
}

export interface TokenRes {
  access_token: string; token_type: string;
  user_id: string; name: string;
}

export interface Question {
  question_id: string; topic_id: string; topic_name: string; subject: string;
  text: string; options: { id: string; text: string }[];
  difficulty: number; difficulty_label: string;
  question_type: "mcq" | "numerical" | "msq";  // GATE has numerical + MSQ
}

export interface SubmitRes {
  correct: boolean; correct_answer: string; explanation: string | null;
  new_mastery: number; mastery_delta: number; xp_gained: number;
  time_rank: "fast" | "normal" | "slow";
}

export interface PlanItem {
  topic_id: string; topic_name: string; subject: string;
  duration_min: number; session_type: string;
  priority: number; current_mastery: number;
  revision_due: boolean; reason: string;
  completed: boolean;
}

export interface HeatCell {
  topic_id: string; topic_name: string; subject: string;
  mastery: number; accuracy: number; total_attempts: number;
  correct_attempts: number; trend: number; mastery_label: string;
}

export interface Prediction {
  predicted_score: number; max_score: number; percentile: number;
  confidence_low: number; confidence_high: number;
  weak_topics: { id: string; name: string; mastery: number }[];
  strong_topics: { id: string; name: string; mastery: number }[];
  days_to_exam: number | null; weighted_mastery: number;
  subject_breakdown: { subject: string; mastery: number; score: number }[];
}

export interface MasteryTrend {
  date: string; avg_mastery: number; topics_covered: number;
  study_minutes: number;
}

export interface RevisionItem {
  topic_id: string; topic_name: string; subject: string;
  due_date: string; days_overdue: number;
  interval_days: number; current_mastery: number;
}

export interface TutorMessage {
  id: string; role: "user" | "assistant";
  content: string; timestamp: string;
  topic?: string; sources?: string[];
}

export interface GamStats {
  xp: number; level: number; level_title: string;
  level_progress_pct: number; xp_to_next: number;
  streak_days: number; streak_warning: string | null;
  total_attempts: number; accuracy: number;
  badges_earned: number; total_badges: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  register: (d: {
    email: string; password: string; name: string;
    exam_target?: string; exam_date?: string;
    weekly_goal_hours?: number;
  }) => req<TokenRes>("/auth/register", { method: "POST", body: JSON.stringify(d) }),

  login: async (email: string, password: string): Promise<TokenRes> => {
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST", body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
  },

  me: () => req<UserProfile>("/auth/me"),
};

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const quiz = {
  next: (topicId: string) => req<Question>(`/quiz/next?topic_id=${topicId}`),
  submit: (d: {
    question_id: string; answer: string;
    time_taken_sec: number; confidence?: number;
  }) => req<SubmitRes>("/quiz/submit", { method: "POST", body: JSON.stringify(d) }),
  history: (limit = 20) => req<any[]>(`/quiz/history?limit=${limit}`),
};

// ── Study Plan ────────────────────────────────────────────────────────────────

export const plan = {
  today:     (hours = 4) => req<PlanItem[]>(`/plan/today?hours=${hours}`),
  complete:  (d: { topic_id: string; duration_min: number; session_type?: string }) =>
             req<any>("/plan/complete", { method: "POST", body: JSON.stringify(d) }),
  revisions: () => req<RevisionItem[]>("/plan/revisions"),
  customize: (d: {
    topic_ids: string[]; hours: number; focus_weak: boolean; include_revisions: boolean;
  }) => req<PlanItem[]>("/plan/customize", { method: "POST", body: JSON.stringify(d) }),
  updateGoal: (hours: number) =>
    req<any>("/plan/goal", { method: "PATCH", body: JSON.stringify({ weekly_goal_hours: hours }) }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analytics = {
  heatmap:      () => req<HeatCell[]>("/analytics/heatmap"),
  predict:      () => req<Prediction>("/analytics/predict"),
  masteryTrend: (days = 30) => req<MasteryTrend[]>(`/analytics/mastery-trend?days=${days}`),
  subjects:     () => req<any[]>("/analytics/subjects"),
};

// ── Tutor (streaming SSE) ─────────────────────────────────────────────────────

export function streamTutor(
  question: string,
  options: {
    topicId?: string; topicName?: string; examTarget?: string;
    conversationHistory?: { role: string; content: string }[];
  },
  callbacks: {
    onChunk: (chunk: string) => void;
    onDone: (sources?: string[]) => void;
    onError: (err: string) => void;
  }
): AbortController {
  const controller = new AbortController();
  const t = token.get();

  fetch(`${BASE}/tutor/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify({
      question,
      topic_id: options.topicId,
      topic_name: options.topicName,
      exam_target: options.examTarget,
      history: options.conversationHistory ?? [],
    }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        callbacks.onError(`Server error ${res.status}: ${res.statusText}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            callbacks.onDone();
            return;
          }
          if (data.startsWith("[SOURCES]")) {
            try {
              const sources = JSON.parse(data.slice(9));
              callbacks.onDone(sources);
            } catch { callbacks.onDone(); }
            return;
          }
          if (data.startsWith("[ERROR]")) {
            callbacks.onError(data.slice(7).trim());
            return;
          }
          if (data) {
            callbacks.onChunk(data);
          }
        }
      }
      callbacks.onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError(err.message ?? "Connection failed");
      }
    });

  return controller;
}

// ── Gamification ──────────────────────────────────────────────────────────────

export const gam = {
  stats:       () => req<GamStats>("/gamification/stats"),
  badges:      () => req<any[]>("/gamification/badges"),
  leaderboard: (limit = 20) => req<any[]>(`/gamification/leaderboard?limit=${limit}`),
};

// ── Topics ────────────────────────────────────────────────────────────────────

export const topics = {
  list:    (subject?: string) => req<any[]>(`/topics${subject ? `?subject=${subject}` : ""}`),
  search:  (q: string) => req<any[]>(`/topics/search?q=${encodeURIComponent(q)}`),
  mastery: () => req<any[]>("/topics/mastery"),
};
