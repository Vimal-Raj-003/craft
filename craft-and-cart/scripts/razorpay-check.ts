// Razorpay check from the command line, against whatever environment this process has.
//   Docker:  craft run --rm craft-web node scripts/razorpay-check.cjs          (add --order to also create a ₹1 test order)
// Prints PASS / FAIL / WARN per stage with Razorpay's own error message. It NEVER prints a key secret.
import { runRazorpayDiagnostics } from "../src/lib/razorpay-diag";

(async () => {
  const steps = await runRazorpayDiagnostics({ createTestOrder: process.argv.includes("--order") });
  for (const s of steps) {
    console.log(`${s.status.padEnd(7)} ${s.title}\n        ${s.detail}${s.hint ? `\n        → ${s.hint}` : ""}`);
  }
  const bad = steps.filter((s) => s.status === "FAIL");
  console.log(bad.length ? `\nFAILED at: ${bad.map((s) => s.title).join("; ")}` : "\nNo failing stage.");
  process.exit(bad.length ? 1 : 0);
})();
