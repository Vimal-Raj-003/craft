import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import AddressBook from "@/components/AddressBook";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = (await getSession())!;
  const { rows } = await pool.query(
    "SELECT id,label,name,phone,line1,city,state,pincode,is_default FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC",
    [user.id],
  );
  return <AddressBook addresses={rows} defaultName={user.name} />;
}
