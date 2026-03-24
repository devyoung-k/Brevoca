import { NextResponse } from "next/server";
import { requireAdminUser, requireRequestUser } from "@/lib/server/auth";
import { createWorkspaceMemberAccountForOwner } from "@/lib/server/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(request);
    requireAdminUser(user);
    const { id } = await context.params;
    const body = (await request.json()) as { email?: string; password?: string };
    const member = await createWorkspaceMemberAccountForOwner(
      user,
      id,
      body.email ?? "",
      body.password ?? "",
    );

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status =
    message === "Unauthorized" ? 401 :
    message === "ForbiddenAdmin" ? 403 :
    message === "AdminConfigMissing" ? 500 :
    message.startsWith("Only workspace owners") ? 403 :
    400;

  return NextResponse.json(
    {
      error:
        message === "Unauthorized" ? "인증이 필요합니다." :
        message === "ForbiddenAdmin" ? "관리자만 계정을 생성할 수 있습니다." :
        message === "AdminConfigMissing" ? "BREVOCA_ADMIN_EMAILS 환경 변수가 설정되지 않았습니다." :
        message,
    },
    { status },
  );
}
