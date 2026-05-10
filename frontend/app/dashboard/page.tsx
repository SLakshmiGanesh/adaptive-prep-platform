import { DashboardView } from "@/components/DashboardView";
import { Shell } from "@/components/Shell";

export default function DashboardPage() {
  return (
    <Shell active="dashboard">
      <DashboardView />
    </Shell>
  );
}
