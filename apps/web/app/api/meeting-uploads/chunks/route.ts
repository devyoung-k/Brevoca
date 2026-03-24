import { NextResponse } from "next/server";
import { requireRequestUser, requireWorkspaceId } from "@/lib/server/auth";
import { requireWorkspaceMembership, uploadMeetingAudioChunk } from "@/lib/server/store";
import { AUDIO_UPLOAD_CHUNK_BYTES } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const workspaceId = requireWorkspaceId(request);
    await requireWorkspaceMembership(user.id, workspaceId);

    const formData = await request.formData();
    const uploadId = normalizeUploadId(formData.get("uploadId"));
    const chunkIndex = normalizeChunkIndex(formData.get("chunkIndex"));
    const chunk = formData.get("chunk");

    if (!(chunk instanceof File)) {
      return NextResponse.json({ error: "업로드 청크가 필요합니다." }, { status: 400 });
    }

    if (chunk.size > AUDIO_UPLOAD_CHUNK_BYTES) {
      return NextResponse.json(
        { error: "업로드 청크 크기가 너무 큽니다. 청크당 최대 45MB까지 허용됩니다." },
        { status: 400 },
      );
    }

    await uploadMeetingAudioChunk(
      uploadId,
      chunkIndex,
      Buffer.from(await chunk.arrayBuffer()),
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function normalizeUploadId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/i.test(value.trim())) {
    throw new Error("InvalidUploadId");
  }

  return value.trim();
}

function normalizeChunkIndex(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    throw new Error("InvalidChunkIndex");
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("InvalidChunkIndex");
  }

  return parsed;
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
