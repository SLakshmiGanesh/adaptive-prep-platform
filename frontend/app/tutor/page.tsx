"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Brain, BookOpen, Sparkles, StopCircle,
  User, RefreshCw, ChevronDown, X, Lightbulb, Copy, Check,
  MessageSquare, Zap, Hash, ChevronRight
} from "lucide-react";
import { streamTutor, plan, auth, token, EXAM_CONFIG } from "@/lib/api";
import type { PlanItem, UserProfile, ExamTarget } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  streaming?: boolean;
  error?: boolean;
  timestamp: number;
}

const STARTERS: Record<string, string[]> = {
  JEE: [
    "Derive the equation of motion using calculus",
    "Explain Gibbs free energy with an example",
    "Solve: ∫ x·sin(x) dx step by step",
    "Why does entropy always increase?",
  ],
  GATE: [
    "Explain time complexity of quicksort",
    "Derive the Laplace transform of e^at",
    "What is the difference between BFS and DFS?",
    "Explain virtual memory with page tables",
  ],
  NEET: [
    "Explain DNA replication with diagram",
    "Difference between mitosis and meiosis",
    "How does the kidneys regulate blood pressure?",
    "Explain the Calvin cycle step by step",
  ],
  UPSC: [
    "Explain the parliamentary system vs presidential",
    "What caused the 2008 financial crisis?",
    "Explain monsoon formation mechanisms",
    "What is the significance of Preamble?",
  ],
  default: [
    "Explain this concept from first principles",
    "Give me a step-by-step worked example",
    "What are common exam mistakes here?",
    "Create a comparison table for these concepts",
  ],
};

/* ── Markdown renderer (lightweight) ────────────────────────────────────────── */
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       "<code>$1</code>")
    .replace(/^### (.+)$/gm,   "<h4>$1</h4>")
    .replace(/^## (.+)$/gm,    "<h3>$1</h3>")
    .replace(/^# (.+)$/gm,     "<h2>$1</h2>")
    .replace(/^> (.+)$/gm,     "<blockquote>$1</blockquote>")
    .replace(/^[-*] (.+)$/gm,  "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n\n/g,           "<br/><br/>")
    .replace(/\n/g,             "<br/>");
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function TutorPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [topics, setTopics] = useState<PlanItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<PlanItem | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputRows, setInputRows] = useState(1);

  const abortRef   = useRef<AbortController | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const topicsRef  = useRef<HTMLDivElement>(null);

  /* ── Init ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    Promise.all([auth.me(), plan.today(8)]).then(([u, p]) => {
      setUser(u);
      setTopics(p);
    }).catch(() => router.replace("/auth"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Close topic picker on outside click ─────────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (topicsRef.current && !topicsRef.current.contains(e.target as Node)) {
        setShowTopics(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Send message ────────────────────────────────────────────────────────── */
  const sendMessage = useCallback((questionText: string) => {
    const q = questionText.trim();
    if (!q || streaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user",
      content: q, timestamp: Date.now(),
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(), role: "assistant",
      content: "", streaming: true, timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setInputRows(1);
    setStreaming(true);

    /* Build conversation history for context window */
    const history = messages.slice(-10).map(m => ({
      role: m.role, content: m.content,
    }));

    abortRef.current = streamTutor(
      q,
      {
        topicId:   selectedTopic?.topic_id,
        topicName: selectedTopic?.topic_name,
        examTarget: user?.exam_target ?? undefined,
        conversationHistory: history,
      },
      {
        onChunk: (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
        onDone: (sources) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last, streaming: false,
                sources: sources ?? [],
              };
            }
            return updated;
          });
          setStreaming(false);
        },
        onError: (err) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last, streaming: false, error: true,
                content: `Connection error: ${err}. Please check your API key and try again.`,
              };
            }
            return updated;
          });
          setStreaming(false);
        },
      }
    );
  }, [streaming, messages, selectedTopic, user]);

  function stopStream() {
    abortRef.current?.abort();
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        updated[updated.length - 1] = { ...last, streaming: false };
      }
      return updated;
    });
    setStreaming(false);
  }

  function clearChat() {
    if (streaming) stopStream();
    setMessages([]);
  }

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize
    const lines = e.target.value.split("\n").length;
    setInputRows(Math.min(lines, 6));
  }

  const examStarters = user?.exam_target
    ? (STARTERS[user.exam_target] ?? STARTERS.default)
    : STARTERS.default;

  const examConfig = user?.exam_target ? EXAM_CONFIG[user.exam_target] : null;

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "var(--void)",
    }}>
      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 52, flexShrink: 0,
        borderBottom: "1px solid var(--line)",
        background: "rgba(8,10,15,0.9)", backdropFilter: "blur(12px)",
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--t3)", textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <span style={{ color: "var(--t4)" }}>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: "linear-gradient(135deg, var(--phosphor), #00cc6a)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={14} color="var(--void)" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>AI Study Tutor</span>
            <span className="badge badge-phosphor" style={{ fontSize: 9 }}>
              <Sparkles size={8} />RAG+LLM
            </span>
          </div>
          {examConfig && (
            <span className="badge badge-neutral">{examConfig.icon} {examConfig.label}</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Topic picker */}
          <div style={{ position: "relative" }} ref={topicsRef}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowTopics(!showTopics)}
            >
              <BookOpen size={13} />
              {selectedTopic ? selectedTopic.topic_name : "All Topics"}
              <ChevronDown size={12} />
            </button>

            {showTopics && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                width: 280, background: "var(--raised)",
                border: "1px solid var(--line-hover)",
                borderRadius: "var(--r-md)", padding: 6, zIndex: 100,
                boxShadow: "var(--shadow-xl)",
              }}>
                <button
                  onClick={() => { setSelectedTopic(null); setShowTopics(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 10px",
                    background: !selectedTopic ? "rgba(0,255,136,0.06)" : "transparent",
                    border: "none", cursor: "pointer", color: !selectedTopic ? "var(--phosphor)" : "var(--t2)",
                    fontSize: 13, borderRadius: "var(--r)", fontFamily: "var(--sans)",
                    fontWeight: !selectedTopic ? 600 : 400,
                  }}
                >
                  All Topics (General)
                </button>
                <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {topics.map(t => (
                    <button
                      key={t.topic_id}
                      onClick={() => { setSelectedTopic(t); setShowTopics(false); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "8px 10px",
                        background: selectedTopic?.topic_id === t.topic_id ? "rgba(0,255,136,0.06)" : "transparent",
                        border: "none", cursor: "pointer",
                        color: selectedTopic?.topic_id === t.topic_id ? "var(--phosphor)" : "var(--t2)",
                        fontSize: 13, borderRadius: "var(--r)", fontFamily: "var(--sans)",
                        display: "flex", flexDirection: "column", gap: 2,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{t.topic_name}</span>
                      <span style={{ fontSize: 11, color: "var(--t3)" }}>
                        {t.subject} · {(t.current_mastery * 100).toFixed(0)}% mastery
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearChat}>
              <RefreshCw size={12} /> New Chat
            </button>
          )}
        </div>
      </div>

      {/* ── CHAT AREA ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }} className="scroll-area">
        {messages.length === 0 ? (
          <TutorWelcome
            user={user}
            starters={examStarters}
            selectedTopic={selectedTopic}
            onSend={sendMessage}
          />
        ) : (
          <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onCopy={copyMessage}
                copied={copiedId === msg.id}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── QUICK STARTERS (shown when chat active) ────────────────────────── */}
      {messages.length > 0 && !streaming && (
        <div style={{ padding: "8px 24px 0", maxWidth: 820, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
            {examStarters.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q + (selectedTopic ? ` (${selectedTopic.topic_name})` : ""))}
                style={{
                  flexShrink: 0, padding: "5px 12px",
                  background: "var(--raised)", border: "1px solid var(--line)",
                  borderRadius: 100, fontSize: 11, color: "var(--t2)",
                  cursor: "pointer", fontFamily: "var(--sans)",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--line-active)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── INPUT BAR ─────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid var(--line)",
        padding: "16px 24px 20px",
        background: "var(--deep)",
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            background: "var(--raised)",
            border: `1px solid ${streaming ? "rgba(0,255,136,0.3)" : "var(--line)"}`,
            borderRadius: "var(--r-lg)", padding: "10px 14px",
            transition: "border-color 0.2s",
            boxShadow: streaming ? "var(--phosphor-glow)" : "none",
          }}>
            {selectedTopic && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)",
                borderRadius: "var(--r)", padding: "3px 8px", flexShrink: 0,
              }}>
                <Hash size={10} color="var(--phosphor)" />
                <span style={{ fontSize: 11, color: "var(--phosphor)", fontWeight: 600 }}>
                  {selectedTopic.topic_name}
                </span>
                <button
                  onClick={() => setSelectedTopic(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 0, display: "flex" }}
                >
                  <X size={10} />
                </button>
              </div>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              rows={inputRows}
              placeholder={
                selectedTopic
                  ? `Ask anything about ${selectedTopic.topic_name}…`
                  : "Ask any concept, doubt, or exam question…"
              }
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "var(--t1)", fontSize: 14, fontFamily: "var(--sans)",
                resize: "none", lineHeight: 1.6, maxHeight: 160,
              }}
            />

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {streaming ? (
                <button
                  onClick={stopStream}
                  style={{
                    width: 34, height: 34, borderRadius: "var(--r)",
                    background: "var(--wrong-bg)", border: "1px solid rgba(255,71,87,0.3)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--wrong)",
                  }}
                >
                  <StopCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  style={{
                    width: 34, height: 34, borderRadius: "var(--r)",
                    background: input.trim() ? "var(--phosphor)" : "var(--float)",
                    border: "none", cursor: input.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                    boxShadow: input.trim() ? "0 0 16px rgba(0,255,136,0.3)" : "none",
                  }}
                >
                  <Send size={15} color={input.trim() ? "var(--void)" : "var(--t4)"} />
                </button>
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--t4)", marginTop: 8 }}>
            Enter to send · Shift+Enter for new line · Answers use your study materials via RAG
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Message Bubble ──────────────────────────────────────────────────────────── */
function MessageBubble({ msg, onCopy, copied }: {
  msg: Message; onCopy: (id: string, content: string) => void; copied: boolean;
}) {
  const isUser = msg.role === "user";

  return (
    <div className="fade-up" style={{
      display: "flex", gap: 12,
      justifyContent: isUser ? "flex-end" : "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, var(--phosphor), #00cc6a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(0,255,136,0.3)",
        }}>
          <Brain size={15} color="var(--void)" />
        </div>
      )}

      <div style={{
        maxWidth: "78%",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{
          padding: isUser ? "10px 16px" : "16px 20px",
          borderRadius: isUser
            ? "var(--r-lg) var(--r-lg) var(--r) var(--r-lg)"
            : "var(--r) var(--r-lg) var(--r-lg) var(--r-lg)",
          background: isUser ? "var(--volt)" : "var(--surface)",
          border: isUser ? "none" : `1px solid ${msg.error ? "rgba(255,71,87,0.3)" : "var(--line)"}`,
          position: "relative",
        }}>
          {isUser ? (
            <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.6, margin: 0 }}>
              {msg.content}
            </p>
          ) : (
            <div
              className={`prose-answer${msg.streaming && !msg.content ? " cursor-blink" : ""}`}
              style={{ color: msg.error ? "var(--wrong)" : "var(--t1)" }}
              dangerouslySetInnerHTML={{
                __html: msg.streaming && !msg.content
                  ? ""
                  : renderMarkdown(msg.content),
              }}
            />
          )}
          {msg.streaming && msg.content && (
            <span style={{
              display: "inline-block", width: 2, height: 16,
              background: "var(--phosphor)", marginLeft: 2, verticalAlign: "middle",
              animation: "blink 0.8s step-end infinite",
            }} />
          )}
        </div>

        {/* Sources + copy */}
        {!isUser && !msg.streaming && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {msg.sources.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 100,
                    background: "var(--raised)", color: "var(--t3)",
                    border: "1px solid var(--line)",
                  }}>
                    📄 {s}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => onCopy(msg.id, msg.content)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--t4)", fontSize: 11, padding: "2px 6px",
                borderRadius: "var(--r-sm)", transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--t2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--t4)")}
            >
              {copied ? <Check size={11} color="var(--phosphor)" /> : <Copy size={11} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "var(--raised)", border: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <User size={14} color="var(--t3)" />
        </div>
      )}
    </div>
  );
}

/* ── Welcome Screen ──────────────────────────────────────────────────────────── */
function TutorWelcome({ user, starters, selectedTopic, onSend }: {
  user: UserProfile | null;
  starters: string[];
  selectedTopic: PlanItem | null;
  onSend: (q: string) => void;
}) {
  const examConfig = user?.exam_target ? EXAM_CONFIG[user.exam_target] : null;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
      {/* Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px",
        background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,255,136,0.05))",
        border: "1px solid rgba(0,255,136,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "var(--phosphor-glow)",
        animation: "pulse-glow 3s ease-in-out infinite",
      }}>
        <Brain size={36} color="var(--phosphor)" />
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.03em" }}>
        Your AI Study Partner
      </h2>
      <p style={{ color: "var(--t2)", fontSize: 15, lineHeight: 1.7, marginBottom: 8, fontFamily: "var(--serif)" }}>
        I understand concepts deeply, solve problems step-by-step, and answer
        from your study materials using RAG retrieval.
        {examConfig && ` Optimized for ${examConfig.label}.`}
      </p>

      {selectedTopic && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)",
          borderRadius: "var(--r)", padding: "6px 14px", marginBottom: 24,
        }}>
          <Zap size={13} color="var(--phosphor)" />
          <span style={{ fontSize: 13, color: "var(--phosphor)", fontWeight: 600 }}>
            Context: {selectedTopic.topic_name}
          </span>
        </div>
      )}

      {/* Capability pills */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
        {[
          "🧮 Step-by-step solutions",
          "📖 Textbook-grounded answers",
          "🎯 Exam-specific tips",
          "💡 Multiple explanation styles",
          "📊 Worked examples",
          "🔁 Multi-turn conversations",
        ].map((cap, i) => (
          <span key={i} style={{
            fontSize: 12, padding: "5px 12px", borderRadius: 100,
            background: "var(--raised)", border: "1px solid var(--line)",
            color: "var(--t2)",
          }}>
            {cap}
          </span>
        ))}
      </div>

      {/* Starter questions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
        {starters.map((q, i) => (
          <button
            key={i}
            onClick={() => onSend(q + (selectedTopic ? ` in the context of ${selectedTopic.topic_name}` : ""))}
            className="card"
            style={{
              padding: "14px 16px", cursor: "pointer",
              textAlign: "left", fontFamily: "var(--sans)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.3)";
              (e.currentTarget as HTMLElement).style.background = "rgba(0,255,136,0.03)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            }}
          >
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <Lightbulb size={14} color="var(--solar)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>{q}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
