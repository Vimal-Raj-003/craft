import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import AccountTabs from "@/components/AccountTabs";

export const dynamic = "force-dynamic";

// Every page under /account needs a signed-in user. Each page then only loads data for THAT user.
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await getSession();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Hi, <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋</h1>
        <LogoutButton />
      </div>
      <AccountTabs />
      <div className="mt-8">{children}</div>
    </div>
  );
}
