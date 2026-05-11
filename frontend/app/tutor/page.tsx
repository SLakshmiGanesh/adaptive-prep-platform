"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Brain, BookOpen, Sparkles,
  StopCircle, User, RefreshCw, ChevronDown
} from "lucide-react";
import { streamTutorAnswer, plan, getToken } from "@/lib/api";
import type { PlanItem } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_QUESTIONS = [
  "Explain this concept with an everyday analogy",
  "Show me a solved example",
  "What are common mistakes students make here?",
  "How is this topic tested in JEE/NEET?",
  "Give me a memory trick for this",
];

export default function TutorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [topics, setTopics] = useState<PlanItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<PlanItem | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/auth"); return; }
    plan.today(8).then(setTopics).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  function updateLastAssistantMessage(chunk: string) {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, content: last.content + chunk };
      }
      return updated;
    });
  }

  function finalizeLastMessage() {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, streaming: false };
      }
      return updated;
    });
  }

  async function sendQuestion(question: string) {
    if (!question.trim() || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    addMessage(userMsg);
    setInput("");

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      streaming: true,
    };
    addMessage(assistantMsg);
    setIsStreaming(true);

    abortRef.current = streamTutorAnswer(
      question,
      selectedTopic?.topic_id,
      selectedTopic?.topic_name,
      (chunk) => updateLastAssistantMessage(chunk),
      () => { finalizeLastMessage(); setIsStreaming(false); },
      (err) => {
        updateLastAssistantMessage(`\n\n*Error: ${err}*`);
        finalizeLastMessage();
        setIsStreaming(false);
      }
    );
  }

  function stopStreaming() {
    abortRef.current?.abort();
    finalizeLastMessage();
    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-0)",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,9,12,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={15} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>AI Tutor</span>
            <span className="badge badge-accent" style={{ fontSize: 10 }}>
              <Sparkles size={9} style={{ marginRight: 3 }} />RAG
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Topic selector */}
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 13 }}
              onClick={() => setShowTopicPicker(!showTopicPicker)}
            >
              <BookOpen size={14} />
              {selectedTopic ? selectedTopic.topic_name : "All Topics"}
              <ChevronDown size={13} />
            </button>
            {showTopicPicker && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 280, background: "var(--surface-1)",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                padding: 8, zIndex: 100,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}>
                <button
                  onClick={() => { setSelectedTopic(null); setShowTopicPicker(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 12px",
                    background: !selectedTopic ? "var(--accent-glow)" : "none",
                    border: "none", cursor: "pointer", color: "var(--text-secondary)",
                    fontSize: 13, borderRadius: "var(--radius-sm)", fontFamily: "var(--font-display)",
                  }}
                >
                  All Topics
                </button>
                {topics.map((t) => (
                  <button
                    key={t.topic_id}
                    onClick={() => { setSelectedTopic(t); setShowTopicPicker(false); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 12px",
                      background: selectedTopic?.topic_id === t.topic_id ? "var(--accent-glow)" : "none",
                      border: "none", cursor: "pointer", color: "var(--text-secondary)",
                      fontSize: 13, borderRadius: "var(--radius-sm)", fontFamily: "var(--font-display)",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.topic_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.subject}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {messages.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={clearChat}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
        {messages.length === 0 && <WelcomeScreen onSend={sendQuestion} />}

        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Quick questions ────────────────────────────────────────── */}
      {messages.length > 0 && selectedTopic && (
        <div style={{
          padding: "0 32px 12px",
          display: "flex", gap: 8, overflowX: "auto",
          borderTop: "none",
        }}>
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendQuestion(q + " for " + selectedTopic.topic_name)}
              disabled={isStreaming}
              style={{
                whiteSpace: "nowrap", padding: "7px 14px",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 100, fontSize: 12, color: "var(--text-secondary)",
                cursor: "pointer", fontFamily: "var(--font-display)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-accent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid var(--border)",
        padding: "20px 32px",
        background: "var(--bg-1)",
      }}>
        <div style={{
          maxWidth: 760, margin: "0 auto",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          display: "flex", alignItems: "flex-end", gap: 12,
          padding: "14px 16px",
          transition: "border-color 0.15s",
        }}
          onFocus={() => {}}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTopic
              ? `Ask anything about ${selectedTopic.topic_name}…`
              : "Ask any concept, doubt, or question…"
            }
            disabled={isStreaming}
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text-primary)", fontSize: 15, fontFamily: "var(--font-display)",
              resize: "none", maxHeight: 160, lineHeight: 1.6,
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              style={{
                padding: "8px 8px", background: "var(--danger-dim)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer", color: "var(--danger)",
                display: "flex", alignItems: "center",
              }}
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              onClick={() => sendQuestion(input)}
              disabled={!input.trim()}
              className="btn btn-primary"
              style={{ padding: "8px 16px", opacity: input.trim() ? 1 : 0.4 }}
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          Enter to send · Shift+Enter for new line · Answers grounded in your study material
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Brain size={16} color="#fff" />
        </div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "var(--accent)" : "var(--surface-2)",
        border: `1px solid ${isUser ? "transparent" : "var(--border)"}`,
        borderRadius: isUser ? "var(--radius) var(--radius) 4px var(--radius)" : "4px var(--radius) var(--radius) var(--radius)",
        padding: "14px 18px",
      }}>
        <div style={{
          fontSize: 14, lineHeight: 1.75,
          color: isUser ? "#fff" : "var(--text-primary)",
          fontFamily: isUser ? "var(--font-display)" : "var(--font-body)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
          className={message.streaming && !message.content ? "cursor" : ""}
        >
          {message.content || (message.streaming ? "" : "…")}
          {message.streaming && message.content && <span className="cursor" />}
        </div>
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "var(--surface-3)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <User size={16} color="var(--text-muted)" />
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({ onSend }: { onSend: (q: string) => void }) {
  const starters = [
    "What is Newton's Second Law of Motion and how is it applied?",
    "Explain the difference between mitosis and meiosis",
    "How does the photoelectric effect work?",
    "What is the significance of the Indian Constitution's Preamble?",
  ];
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, margin: "0 auto 24px",
        background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Brain size={32} color="#fff" />
      </div>
      <h2 style={{ marginBottom: 8 }}>Your AI Study Tutor</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 40, lineHeight: 1.7 }}>
        Ask any concept, request worked examples, or clear doubts.<br />
        Answers are grounded in your study materials using retrieval AI.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}>
        {starters.map((q, i) => (
          <button
            key={i}
            onClick={() => onSend(q)}
            className="card"
            style={{
              padding: "16px 20px", cursor: "pointer",
              background: "var(--surface-1)", border: "1px solid var(--border)",
              textAlign: "left", transition: "all 0.15s",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{q}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
