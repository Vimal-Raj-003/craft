import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { AFTER_LOGIN_HOME, safeNext } from "@/lib/safe-next";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);

  // Already signed in: never show Sign Up / Sign In again; carry on shopping (or to the page they wanted).
  const user = await getSession();
  if (user) redirect(next ?? (user.role === "SUPER_ADMIN" ? "/admin/dashboard" : AFTER_LOGIN_HOME));

  return <LoginForm initialMode={sp.mode === "register" ? "register" : "login"} />;
}
