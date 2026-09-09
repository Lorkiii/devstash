import { requireSession } from "@/app/lib/auth/session";
import { PasswordGenerator } from "@/app/components/generator/password-generator";

export default async function GeneratorPage() {
  await requireSession();
  return <PasswordGenerator />;
}
