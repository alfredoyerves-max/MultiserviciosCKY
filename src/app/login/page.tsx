import { countUsuarios } from "@/lib/data/usuarios";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if ((await countUsuarios()) === 0) redirect("/setup");
  if (await getSession()) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-on-primary">
            MY
          </div>
          <h1 className="text-lg font-semibold text-text">Quotly</h1>
          <p className="mt-1 text-sm text-text-muted">Multiservicios Yerves</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
