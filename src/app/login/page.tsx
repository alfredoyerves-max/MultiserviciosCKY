import { countUsuarios } from "@/lib/data/usuarios";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if ((await countUsuarios()) === 0) redirect("/setup");
  if (await getSession()) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-black/30 ring-1 ring-primary/20">
            <Image
              src="/branding/logo-icon.png"
              alt="Carlos Yerves Multiservicios"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-semibold text-text">Quotly</h1>
          <p className="mt-1 text-sm text-text-muted">Carlos Yerves Multiservicios</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
