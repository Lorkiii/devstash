// Shapes of decrypted vault content as it exists in browser memory while the
// vault is unlocked. Nothing here is a wire or storage format; the encrypted
// envelope is designed in its own phase.

export type VaultItemType =
  | "LOGIN"
  | "API_KEY"
  | "DATABASE"
  | "SSH_KEY"
  | "RECOVERY_CODE"
  | "GENERIC_SECRET";

export interface VaultField {
  key: string;
  label: string;
  value: string;
  /** Secret fields are masked by default and only shown through timed reveal. */
  secret: boolean;
}

export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  projectId?: string;
  fields: VaultField[];
  notes?: string;
  tags: string[];
  updatedAt: string;
}

export interface EnvBundle {
  id: string;
  projectId: string;
  environment: string;
  /** Whole .env file, one KEY=VALUE per line. Names and values are both private. */
  content: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  projectId?: string;
  title: string;
  body: string;
  tags: string[];
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  done: boolean;
  dueDate?: string;
  sortOrder: number;
}

export interface VaultData {
  secrets: VaultItem[];
  envBundles: EnvBundle[];
  projects: Project[];
  notes: Note[];
  tasks: Task[];
}

export type RecentKind = "secret" | "project" | "note" | "task";

export interface RecentRef {
  kind: RecentKind;
  id: string;
  openedAt: number;
}
