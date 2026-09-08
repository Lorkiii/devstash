"use client";

import React, { use } from "react";
import { ProjectDetail } from "@/app/components/projects/project-detail";

// The route only carries the record ID, which is approved plaintext metadata.
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectDetail projectId={id} />;
}
