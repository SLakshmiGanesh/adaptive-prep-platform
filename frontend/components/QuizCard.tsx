"use client";

import { useEffect, useState } from "react";
import { getNextQuestion, QuizQuestion, submitAttempt, SubmitAttemptResponse } from "@/lib/api";

export function QuizCard() {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<SubmitAttemptResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNextQuestion().then(setQuestion);
  }, []);

  async function onSubmit() {
    if (!question || selected === null) {
      return;
    }
    setBusy(true);
    const result = await submitAttempt(question.question_id, selected);
    setFeedback(result);
    setQuestion(result.next_question);
    setSelected(null);
    setBusy(false);
  }

  if (!question) {
    return <div className="card">Loading adaptive question...</div>;
  }

  return (
    <div className="card">
      <span className="badge">{question.difficulty}</span>
      <h2>{question.topic_name}</h2>
      <p>{question.prompt}</p>
      {question.choices.map((choice, index) => (
        <button
          className={`choice ${selected === index ? "selected" : ""}`}
          key={choice}
          onClick={() => setSelected(index)}
          type="button"
        >
          {choice}
        </button>
      ))}
      <button className="primary" disabled={selected === null || busy} onClick={onSubmit} type="button">
        Submit answer
      </button>
      {feedback ? (
        <div className="feedback">
          <strong>{feedback.correct ? "Correct" : "Needs review"}</strong>
          <p>{feedback.explanation}</p>
          <span className="muted">
            Updated {feedback.updated_mastery.topic_name} mastery: {Math.round(feedback.updated_mastery.mastery * 100)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
