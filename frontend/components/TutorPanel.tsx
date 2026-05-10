"use client";

import { FormEvent, useState } from "react";
import { askTutor, TutorResponse } from "@/lib/api";

export function TutorPanel() {
  const [topicId, setTopicId] = useState("algebra");
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<TutorResponse | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }
    setReply(await askTutor(topicId, question));
  }

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <form className="tutor-form" onSubmit={onSubmit}>
        <input onChange={(event) => setTopicId(event.target.value)} value={topicId} />
        <textarea onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about a topic" value={question} />
        <button className="primary" type="submit">Ask tutor</button>
      </form>
      {reply ? (
        <div className="feedback">
          <p>{reply.answer}</p>
          <strong>{reply.suggested_next_step}</strong>
        </div>
      ) : null}
    </div>
  );
}
