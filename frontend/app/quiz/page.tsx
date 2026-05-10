import { QuizCard } from "@/components/QuizCard";
import { Shell } from "@/components/Shell";

export default function QuizPage() {
  return (
    <Shell active="quiz">
      <div className="topbar">
        <div>
          <h1>Adaptive Quiz</h1>
          <p className="muted">The engine selects the next question from your weakest topics.</p>
        </div>
      </div>
      <QuizCard />
    </Shell>
  );
}
