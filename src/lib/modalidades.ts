import type { Modalidad } from "@/lib/enums";

export function parseModalidades(json: string): Modalidad[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
