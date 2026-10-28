import jsManifest from "@/data/curriculum/javascript.json";
import jsFundManifest from "@/data/curriculum/js-fundamentals.json";
import { SubjectManifest } from "@/types/curriculum";

const MANIFESTS: Record<string, SubjectManifest> = {
  javascript: jsManifest as SubjectManifest,
  "js-fundamentals": jsFundManifest as SubjectManifest,
};

export function getSubjectManifest(subjectId: string): SubjectManifest | null {
  return MANIFESTS[subjectId] || null;
}

export function getAllSubjects(): { id: string; name: string; category: string; totalItems: number; topicCount: number; description: string }[] {
  return Object.values(MANIFESTS).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    totalItems: m.totalItems,
    topicCount: m.topics.length,
    description: m.description,
  }));
}
