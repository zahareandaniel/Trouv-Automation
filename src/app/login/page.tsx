import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSessionEmail } from "@/lib/auth";

export default async function LoginPage() {
  if (await getSessionEmail()) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm border border-border bg-surface p-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted">
          Trouv Chauffeurs
        </p>
        <h1 className="mt-2 font-serif text-2xl text-text">Content admin</h1>
        <p className="mt-2 text-sm text-muted">Internal access only.</p>
        <LoginForm />
      </div>
    </div>
  );
}
