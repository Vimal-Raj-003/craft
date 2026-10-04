const TONE: Record<string, string> = {
  confirmed: "bg-mint/15 text-mint",
  delivered: "bg-mint/15 text-mint",
  shipped: "bg-mint/15 text-mint",
  paid: "bg-mint/15 text-mint",
  processing: "bg-amber/15 text-amber",
  pending: "bg-amber/15 text-amber",
  cancelled: "bg-pink/15 text-pink",
  failed: "bg-pink/15 text-pink",
};

/** Small coloured pill for order and payment statuses. */
export default function StatusBadge({ value, label }: { value: string | null; label?: string }) {
  const v = value ?? "—";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TONE[v] ?? "bg-black/5 text-dim"}`}>
      {label ?? v}
    </span>
  );
}
