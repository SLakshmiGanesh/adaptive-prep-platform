import { Mastery } from "@/lib/api";

export function HeatMap({ mastery }: { mastery: Mastery[] }) {
  return (
    <div>
      {mastery.map((item) => (
        <div className="topic-row" key={item.topic_id}>
          <div>
            <strong>{item.topic_name}</strong>
            <div className="muted">{item.subject}</div>
          </div>
          <div className="bar">
            <div className={`fill risk-${item.risk}`} style={{ width: `${Math.round(item.mastery * 100)}%` }} />
          </div>
          <strong>{Math.round(item.mastery * 100)}%</strong>
        </div>
      ))}
    </div>
  );
}
