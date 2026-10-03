"use client";

export default function LogoutButton() {
  return (
    <button
      className="btn btn-ghost !py-2 text-sm"
      onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}
    >
      Sign out
    </button>
  );
}
