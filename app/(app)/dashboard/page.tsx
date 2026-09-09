import { requireSession } from "@/app/lib/auth/session";
import { DashboardOverview } from "@/app/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  await requireSession();
  return <DashboardOverview />;
}
