import { NextResponse } from "next/server";
import {
  defaultPromptTemplateId,
  promptTemplateIds,
  type MeetingSourceType,
} from "@brevoca/contracts";
import { requireRequestUser, requireWorkspaceId } from "@/lib/server/auth";
import { startMeetingProcessing } from "@/lib/server/process-meeting";
import {
  buildMeetingAudioChunkPrefix,
  buildMeetingAudioStorageKey,
  createMeeting,
  requireWorkspaceMembership,
} from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const workspaceId = requireWorkspaceId(request);
    await requireWorkspaceMembership(user.id, workspaceId);

    const body = (await request.json()) as {
      uploadId?: string;
      totalChunks?: number;
      fileName?: string;
      title?: string;
      language?: string;
      promptTemplateId?: string;
      sourceType?: string;
      tags?: unknown;
      durationSec?: number | null;
    };

    const uploadId = normalizeUploadId(body.uploadId);
    const fileName = normalizeFileName(body.fileName);
    const sourceType = normalizeSourceType(body.sourceType);
    const title = normalizeTitle(body.title, fileName);
    const language = normalizeString(body.language) || "ko";
    const promptTemplateId = normalizePromptTemplate(body.promptTemplateId);
    const tags = normalizeTags(body.tags);
    const durationSec = normalizeDuration(body.durationSec);
    const totalChunks = normalizeChunkCount(body.totalChunks);
    const storageKey =
      totalChunks > 1
        ? buildMeetingAudioChunkPrefix(uploadId)
        : buildMeetingAudioStorageKey(uploadId, fileName);

    const response = await createMeeting({
      workspaceId,
      meetingId: uploadId,
      storageKey,
      audioChunkCount: totalChunks,
      fileName,
      title,
      language,
      sourceType,
      tags,
      promptTemplateId,
      durationSec,
    });

    startMeetingProcessing(response.jobId);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function normalizeUploadId(value: string | undefined) {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/i.test(value.trim())) {
    throw new Error("InvalidUploadId");
  }

  return value.trim();
}

function normalizeFileName(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new Error("InvalidFileName");
  }

  return normalized;
}

function normalizeTitle(value: string | undefined, fileName: string) {
  const normalized = normalizeString(value);
  if (normalized) {
    return normalized;
  }

  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

function normalizeString(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDuration(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeChunkCount(value: number | undefined) {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error("InvalidChunkCount");
  }

  return Number(value);
}

function normalizeSourceType(value: string | undefined): MeetingSourceType {
  return value === "browser_recording" ? "browser_recording" : "upload";
}

function normalizePromptTemplate(value: string | undefined) {
  return promptTemplateIds.find((item) => item === value) ?? defaultPromptTemplateId;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (message === "MissingWorkspace") {
    return NextResponse.json({ error: "워크스페이스를 선택해주세요." }, { status: 400 });
  }
  if (message === "Forbidden") {
    return NextResponse.json(
      { error: "이 워크스페이스에 대한 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
