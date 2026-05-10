"use client";

import { useEffect, useState } from "react";
import { DashboardSummary, getDashboard } from "@/lib/api";
import { HeatMap } from "@/components/HeatMap";
import { ProgressChart } from "@/components/ProgressChart";
import { StudyFeed } from "@/components/StudyFeed";

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError("Start the FastAPI backend on port 8000 to load live data."));
  }, []);

  if (error) {
    return <div className="card">{error}</div>;
  }

  if (!data) {
    return <div className="card">Loading learning profile...</div>;
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Personalized practice, topic risk, spaced revision, and tutor support.</p>
        </div>
        <div className="score">
          <span className="muted">Predicted score</span>
          <strong>{data.predicted_score}</strong>
        </div>
      </div>
      <section className="grid">
        <Metric title="Readiness" value={`${Math.round(data.readiness * 100)}%`} />
        <Metric title="Attempts" value={String(data.total_attempts)} />
        <Metric title="Study streak" value={`${data.streak_days}d`} />
        <div className="card span-8">
          <h2>Topic Mastery</h2>
          <HeatMap mastery={data.mastery} />
        </div>
        <div className="card span-4">
          <h2>Progress</h2>
          <ProgressChart mastery={data.mastery} />
        </div>
        <div className="card span-12">
          <h2>Study Feed</h2>
          <StudyFeed recommendations={data.recommendations} revisions={data.revision_queue} />
        </div>
      </section>
    </>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="card span-4 metric">
      <span className="muted">{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
