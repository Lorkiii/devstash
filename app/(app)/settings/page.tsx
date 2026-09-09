import { requireSession } from "@/app/lib/auth/session";
import { SettingsPanels } from "@/app/components/settings/settings-panels";

export default async function SettingsPage() {
  await requireSession();
  return <SettingsPanels />;
}
