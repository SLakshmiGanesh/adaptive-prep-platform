import { Mastery } from "@/lib/api";

export function ProgressChart({ mastery }: { mastery: Mastery[] }) {
  const average = mastery.length ? mastery.reduce((sum, item) => sum + item.mastery, 0) / mastery.length : 0;
  const lowRisk = mastery.filter((item) => item.risk === "low").length;

  return (
    <div className="list">
      <div className="list-item">
        <span className="muted">Average mastery</span>
        <strong style={{ display: "block", fontSize: 28 }}>{Math.round(average * 100)}%</strong>
      </div>
      <div className="list-item">
        <span className="muted">Low-risk topics</span>
        <strong style={{ display: "block", fontSize: 28 }}>{lowRisk}/{mastery.length}</strong>
      </div>
    </div>
  );
}
