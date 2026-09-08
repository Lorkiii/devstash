import { Suspense } from "react";
import { NotesBrowser } from "@/app/components/notes/notes-browser";

// useSearchParams inside NotesBrowser requires a Suspense boundary.
export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesBrowser />
    </Suspense>
  );
}
