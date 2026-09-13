import type { Note, Project } from "@/app/lib/vault-data.types";
import type { NoteInput } from "@/app/lib/workspace.types";

export interface NoteFormProps {
  note?: Note;
  projects: Project[];
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: NoteInput) => Promise<void>;
}
