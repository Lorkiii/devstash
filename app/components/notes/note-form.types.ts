import type { Note, Project } from "@/app/lib/vault-data.types";
import type { NoteInput } from "@/app/lib/workspace.types";

export interface NoteFormProps {
  note?: Note;
  initialDraft?: Pick<NoteInput, "title" | "body" | "tags">;
  projects: Project[];
  /** Locks the relationship in project-scoped workspaces without a hidden input. */
  fixedProject?: Pick<Project, "id" | "name">;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: NoteInput) => Promise<void>;
}
