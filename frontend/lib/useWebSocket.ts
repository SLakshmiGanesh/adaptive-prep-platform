"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getToken } from "@/lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export type WSEvent =
  | { type: "mastery_update"; topic_id: string; topic_name: string; new_mastery: number; delta: number }
  | { type: "xp_gained"; xp: number; total_xp: number; reason: string }
  | { type: "streak_update"; streak_days: number; broken: boolean }
  | { type: "connected"; user_id: string }
  | { type: "heartbeat" }
  | { type: "pong" };

interface UseWebSocketOptions {
  onEvent?: (event: WSEvent) => void;
  enabled?: boolean;
}

export function useWebSocket({ onEvent, enabled = true }: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !enabled) return;

    const url = `${WS_URL}/ws?token=${token}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      // Cancel any pending reconnect
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        setLastEvent(event);
        onEvent?.(event);

        // Auto-ping to keep alive
        if (event.type === "heartbeat") {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Reconnect after 3 seconds
      if (enabled) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [enabled, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, lastEvent, send };
}
