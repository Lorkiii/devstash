interface PreviewRecordBase {
  id: string;
  title: string;
  meta: string;
}

export type PreviewRecord =
  | (PreviewRecordBase & {
      kind: "secret";
      description: string;
    })
  | (PreviewRecordBase & {
      kind: "env";
      variables: readonly string[];
    })
  | (PreviewRecordBase & {
      kind: "note";
      paragraphs: readonly string[];
    })
  | (PreviewRecordBase & {
      kind: "task";
      status: "PLANNED" | "IN PROGRESS" | "DONE";
      description: string;
    });

export type PreviewModuleId = "secrets" | "env" | "notes" | "tasks";

export interface PreviewModule {
  id: PreviewModuleId;
  number: string;
  label: string;
  caption: string;
  records: readonly PreviewRecord[];
}

export interface LandingVaultPreviewProps {
  modules: readonly PreviewModule[];
}
