import { NextResponse } from "next/server";
import {
  defaultPromptTemplateId,
  promptTemplateIds,
  workspaceDefaultLanguages,
  workspaceExportFormats,
  type PromptTemplateId,
  type WorkspaceDefaultLanguage,
  type WorkspaceExportFormat,
} from "@brevoca/contracts";
import { requireRequestUser } from "@/lib/server/auth";
import {
  deleteWorkspaceForOwner,
  getWorkspaceDetailForUser,
  updateWorkspaceSettingsForUser,
} from "@/lib/server/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(request);
    const { id } = await context.params;
    const payload = await getWorkspaceDetailForUser(user, id);
    return NextResponse.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      glossaryText?: string;
      defaultLanguage?: string;
      defaultPromptTemplateId?: string;
      defaultExportFormat?: string;
    };
    const workspace = await updateWorkspaceSettingsForUser(user, id, {
      name: body.name ?? "",
      description: normalizeDescription(body.description),
      glossaryText: normalizeGlossaryText(body.glossaryText),
      defaultLanguage: normalizeLanguage(body.defaultLanguage),
      defaultPromptTemplateId: normalizePromptTemplateId(body.defaultPromptTemplateId),
      defaultExportFormat: normalizeExportFormat(body.defaultExportFormat),
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(request);
    const { id } = await context.params;
    const payload = await deleteWorkspaceForOwner(user, id);
    return NextResponse.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status = message === "Unauthorized" ? 401 : message.includes("verify workspace membership") ? 403 : 400;
  return NextResponse.json(
    { error: message === "Unauthorized" ? "인증이 필요합니다." : message },
    { status },
  );
}

function normalizeDescription(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGlossaryText(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLanguage(value: string | undefined): WorkspaceDefaultLanguage {
  return workspaceDefaultLanguages.find((item) => item === value) ?? "ko";
}

function normalizePromptTemplateId(value: string | undefined): PromptTemplateId {
  return promptTemplateIds.find((item) => item === value) ?? defaultPromptTemplateId;
}

function normalizeExportFormat(value: string | undefined): WorkspaceExportFormat {
  return workspaceExportFormats.find((item) => item === value) ?? "markdown";
}
