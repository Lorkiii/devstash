import { requireSession } from "@/app/lib/auth/session";
import { NotesBrowser } from "@/app/components/notes/notes-browser";

export default async function NotesPage() {
  await requireSession();
  return <NotesBrowser />;
}
