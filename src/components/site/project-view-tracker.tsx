"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Evento project_view (estrutura-e-copy.md, seção 9.2): slug e mecanismo, nada pessoal.
export function ProjectViewTracker({ slug, mechanism }: { slug: string; mechanism: string }) {
  useEffect(() => {
    track("project_view", { project_slug: slug, mechanism });
  }, [slug, mechanism]);
  return null;
}
