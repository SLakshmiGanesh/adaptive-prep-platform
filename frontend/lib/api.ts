export type Risk = "low" | "medium" | "high";

export type Mastery = {
  topic_id: string;
  topic_name: string;
  subject: string;
  mastery: number;
  attempts: number;
  accuracy: number;
  risk: Risk;
};

export type Recommendation = {
  topic_id: string;
  topic_name: string;
  reason: string;
  priority: Risk;
  suggested_activity: string;
};

export type RevisionItem = {
  topic_id: string;
  topic_name: string;
  due_label: string;
  mastery: number;
};

export type DashboardSummary = {
  student_id: string;
  readiness: number;
  predicted_score: number;
  total_attempts: number;
  streak_days: number;
  mastery: Mastery[];
  recommendations: Recommendation[];
  revision_queue: RevisionItem[];
};

export type QuizQuestion = {
  question_id: string;
  topic_id: string;
  topic_name: string;
  prompt: string;
  choices: string[];
  difficulty: "easy" | "medium" | "hard";
};

export type SubmitAttemptResponse = {
  correct: boolean;
  answer_index: number;
  explanation: string;
  updated_mastery: Mastery;
  next_question: QuizQuestion;
};

export type TutorResponse = {
  answer: string;
  suggested_next_step: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const STUDENT_ID = "demo-student";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getDashboard() {
  return request<DashboardSummary>(`/api/study-plan/${STUDENT_ID}/dashboard`);
}

export function getNextQuestion() {
  return request<QuizQuestion>(`/api/quiz/${STUDENT_ID}/next-question`);
}

export function submitAttempt(questionId: string, selectedIndex: number) {
  return request<SubmitAttemptResponse>("/api/quiz/attempts", {
    method: "POST",
    body: JSON.stringify({
      student_id: STUDENT_ID,
      question_id: questionId,
      selected_index: selectedIndex,
      response_time_seconds: 45,
    }),
  });
}

export function askTutor(topicId: string, question: string) {
  return request<TutorResponse>("/api/tutor", {
    method: "POST",
    body: JSON.stringify({
      student_id: STUDENT_ID,
      topic_id: topicId,
      question,
    }),
  });
}
