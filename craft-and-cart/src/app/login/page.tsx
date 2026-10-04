import LoginForm from "@/components/LoginForm";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return <LoginForm initialMode={sp.mode === "register" ? "register" : "login"} />;
}