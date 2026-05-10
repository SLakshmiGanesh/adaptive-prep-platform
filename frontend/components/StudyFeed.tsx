import { Recommendation, RevisionItem } from "@/lib/api";

export function StudyFeed({ recommendations, revisions }: { recommendations: Recommendation[]; revisions: RevisionItem[] }) {
  return (
    <div className="cards">
      {recommendations.map((item) => (
        <div className="list-item" key={item.topic_id}>
          <span className="badge">{item.priority}</span>
          <h3>{item.topic_name}</h3>
          <p className="muted">{item.reason}</p>
          <strong>{item.suggested_activity}</strong>
        </div>
      ))}
      {revisions.map((item) => (
        <div className="list-item" key={`revision-${item.topic_id}`}>
          <span className="badge">revision</span>
          <h3>{item.topic_name}</h3>
          <p className="muted">{item.due_label}</p>
          <strong>{Math.round(item.mastery * 100)}% mastery</strong>
        </div>
      ))}
    </div>
  );
}
