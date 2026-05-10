import { Shell } from "@/components/Shell";
import { TutorPanel } from "@/components/TutorPanel";

export default function TutorPage() {
  return (
    <Shell active="tutor">
      <div className="topbar">
        <div>
          <h1>AI Tutor</h1>
          <p className="muted">Ask concept questions and get retrieval-backed study guidance.</p>
        </div>
      </div>
      <TutorPanel />
    </Shell>
  );
}
