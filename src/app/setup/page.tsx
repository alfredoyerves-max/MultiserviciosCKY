import { countUsuarios } from "@/lib/data/usuarios";
import { redirect } from "next/navigation";
import Image from "next/image";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const existentes = await countUsuarios();
  if (existentes > 0) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <Image
              src="/branding/logo-icon.png"
              alt="Carlos Yerves Multiservicios"
              width={44}
              height={44}
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-lg font-semibold text-text">Configuración inicial</h1>
          <p className="mt-1 text-sm text-text-muted">
            Primer uso del sistema — crea tu cuenta y los datos de tu empresa.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
