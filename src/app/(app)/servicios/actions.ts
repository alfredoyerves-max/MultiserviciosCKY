"use server";

import { createPuesto, deletePuesto, updatePuesto } from "@/lib/data/puestos";
import { createServicio, setServicioActivo, updateServicio } from "@/lib/data/servicios";
import { puestoSchema } from "@/lib/schemas/puesto";
import { servicioSchema } from "@/lib/schemas/servicio";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { FormActionState } from "./form-state";

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

export async function savePuestoAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const id = formData.get("id");
  const parsed = puestoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  if (id && typeof id === "string") {
    await updatePuesto(id, parsed.data);
  } else {
    await createPuesto(parsed.data);
  }
  revalidatePath("/servicios");
  return { ok: true };
}

export async function deletePuestoAction(id: string) {
  await requireSession();
  await deletePuesto(id);
  revalidatePath("/servicios");
}

export async function saveServicioAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireSession();

  const id = formData.get("id");
  const raw = Object.fromEntries(formData.entries());
  const puestoId = formData.get("puestoId");
  const parsed = servicioSchema.safeParse({
    ...raw,
    puestoId: puestoId && puestoId !== "" ? puestoId : undefined,
    modalidades: formData.getAll("modalidades"),
    incluyeUniforme: formData.get("incluyeUniforme") === "on",
    incluyeMaterial: formData.get("incluyeMaterial") === "on",
    guardarComoPuesto: formData.get("guardarComoPuesto") === "on",
  });

  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  if (id && typeof id === "string") {
    await updateServicio(id, parsed.data);
  } else {
    await createServicio(parsed.data);
  }
  revalidatePath("/servicios");
  return { ok: true };
}

export async function toggleServicioActivoAction(id: string, activo: boolean) {
  await requireSession();
  await setServicioActivo(id, activo);
  revalidatePath("/servicios");
}
