import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type CurrentAdmin = {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER";
};

function isAdminRole(value: unknown): value is CurrentAdmin["role"] {
  return value === "OWNER" || value === "MANAGER";
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.isActive !== true || !isAdminRole(session.user.role)) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireCurrentAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
