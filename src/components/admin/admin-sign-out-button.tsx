"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { adminAuthClient } from "@/lib/auth-client";

export function AdminSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    await adminAuthClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button className="admin-sign-out" type="button" onClick={signOut} disabled={pending}>
      {pending ? "Выходим…" : "Выйти"}
    </button>
  );
}
