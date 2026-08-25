import { countUsuarios } from "@/lib/data/usuarios";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const existentes = await countUsuarios();
  if (existentes > 0) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-on-primary">
            MY
          </div>
          <h1 className="text-lg font-semibold text-text">Configura tu cuenta</h1>
          <p className="mt-1 text-sm text-text-muted">
            Primer uso de Quotly — crea la única cuenta de acceso.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
