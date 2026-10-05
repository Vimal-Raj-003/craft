import { redirect } from "next/navigation";
import { getSession, getStaff } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

// Everything under /admin (except /admin/login) needs staff (ADMIN or SUPER_ADMIN), checked on the server for every request.
// Pages that only the SUPER_ADMIN may use check that again themselves, and so does every API route.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) {
    // A signed-in customer is sent back to the shop, never shown anything from the admin area.
    redirect((await getSession()) ? "/shop" : "/admin/login");
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">Studio <span className="text-gradient">admin</span></h1>
        <div className="flex items-center gap-3 text-sm text-dim">
          <span className="hidden sm:inline">{staff.email} · {staff.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</span>
          <LogoutButton />
        </div>
      </div>
      <div className="mt-6"><AdminNav superAdmin={staff.role === "SUPER_ADMIN"} /></div>
      <div className="mt-8">{children}</div>
    </div>
  );
}