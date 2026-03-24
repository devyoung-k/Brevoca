import { NextResponse } from "next/server";
import { requireRequestUser, requireWorkspaceId } from "@/lib/server/auth";
import {
  buildMeetingAudioChunkKey,
  buildMeetingAudioStorageKey,
  requireWorkspaceMembership,
} from "@/lib/server/store";
import { getMeetingAudioBucket, getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const workspaceId = requireWorkspaceId(request);
    await requireWorkspaceMembership(user.id, workspaceId);

    const body = (await request.json()) as {
      uploadId?: string;
      fileName?: string;
      chunkIndex?: number | null;
    };

    const uploadId = normalizeUploadId(body.uploadId);
    const fileName = normalizeFileName(body.fileName);
    const chunkIndex = normalizeChunkIndex(body.chunkIndex);
    const path = chunkIndex === null
      ? buildMeetingAudioStorageKey(uploadId, fileName)
      : buildMeetingAudioChunkKey(uploadId, chunkIndex);

    const bucket = getMeetingAudioBucket();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      throw new Error(`Failed to create signed upload url: ${error.message}`);
    }

    if (!data?.path || !data.token) {
      throw new Error("Failed to create signed upload url: no upload token returned");
    }

    return NextResponse.json({
      bucket,
      path: data.path,
      token: data.token,
    });
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
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("InvalidFileName");
  }

  return value.trim();
}

function normalizeChunkIndex(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("InvalidChunkIndex");
  }

  return Number(value);
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
