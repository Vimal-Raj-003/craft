import { redirect } from "next/navigation";
import { getAdmin } from "./auth";

/** For pages only the SUPER_ADMIN may open (users, offers, diagnostics). Staff (ADMIN) are sent back to the dashboard. */
export async function requireSuper() {
  const s = await getAdmin();
  if (!s) redirect("/admin/dashboard");
  return s;
}