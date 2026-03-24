import "server-only";

import { getSupabaseAdmin } from "./supabase";

export interface RequestUser {
  id: string;
  email: string | null;
}

export async function requireRequestUser(request: Request): Promise<RequestUser> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("Unauthorized");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export function requireAdminUser(user: Pick<RequestUser, "email">): void {
  const adminEmails = getAdminEmails();
  if (adminEmails.size === 0) {
    throw new Error("AdminConfigMissing");
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  if (!normalizedEmail || !adminEmails.has(normalizedEmail)) {
    throw new Error("ForbiddenAdmin");
  }
}

export function getWorkspaceId(request: Request): string | null {
  const value = request.headers.get("x-workspace-id")?.trim();
  return value || null;
}

export function requireWorkspaceId(request: Request): string {
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    throw new Error("MissingWorkspace");
  }
  return workspaceId;
}

function getBearerToken(request: Request): string | null {
  const value = request.headers.get("authorization")?.trim();
  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice("Bearer ".length).trim();
  return token || null;
}

function getAdminEmails(): Set<string> {
  const rawValue =
    process.env.BREVOCA_ADMIN_EMAILS ??
    process.env.ADMIN_EMAILS ??
    "";

  return new Set(
    rawValue
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
