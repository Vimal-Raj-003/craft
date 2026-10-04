import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import ProfileForms from "@/components/ProfileForms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = (await getSession())!;
  const { rows } = await pool.query("SELECT name,email,phone,created_at FROM users WHERE id=$1", [user.id]);
  const p = rows[0];
  return (
    <ProfileForms
      name={p.name}
      email={p.email}
      phone={p.phone ?? ""}
      since={new Date(p.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
    />
  );
}
