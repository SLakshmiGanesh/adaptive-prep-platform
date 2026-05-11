"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, TrendingUp, Flame, Award, X } from "lucide-react";

export interface Toast {
  id: string;
  type: "xp" | "mastery" | "streak" | "badge" | "info";
  title: string;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ICONS = {
  xp: <Zap size={16} color="var(--warning)" />,
  mastery: <TrendingUp size={16} color="var(--success)" />,
  streak: <Flame size={16} color="var(--warning)" />,
  badge: <Award size={16} color="var(--accent-bright)" />,
  info: null,
};

const COLORS = {
  xp:      { bg: "var(--warning-dim)",   border: "rgba(245,158,11,0.3)" },
  mastery: { bg: "var(--success-dim)",   border: "rgba(34,211,165,0.3)" },
  streak:  { bg: "var(--warning-dim)",   border: "rgba(245,158,11,0.3)" },
  badge:   { bg: "var(--accent-glow)",   border: "var(--border-accent)"  },
  info:    { bg: "var(--surface-2)",     border: "var(--border)"          },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { bg, border } = COLORS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className="fade-up"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        background: bg, border: `1px solid ${border}`,
        borderRadius: "var(--radius-sm)", padding: "12px 16px",
        minWidth: 280, maxWidth: 360,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        pointerEvents: "all",
      }}
    >
      {ICONS[toast.type] && (
        <div style={{ marginTop: 2, flexShrink: 0 }}>{ICONS[toast.type]}</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
          {toast.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 2, flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Toast Manager ──────────────────────────────────────────────────────────────

let globalAddToast: ((toast: Omit<Toast, "id">) => void) | null = null;

export function addToast(toast: Omit<Toast, "id">) {
  globalAddToast?.(toast);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]); // max 5 at once
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    globalAddToast = add;
    return () => { globalAddToast = null; };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
