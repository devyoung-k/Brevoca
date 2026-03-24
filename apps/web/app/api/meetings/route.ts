import { NextResponse } from "next/server";
import {
    defaultPromptTemplateId,
    promptTemplateIds,
    type MeetingSourceType,
} from "@brevoca/contracts";
import { requireRequestUser, requireWorkspaceId } from "@/lib/server/auth";
import { startMeetingProcessing } from "@/lib/server/process-meeting";
import {
    createMeeting,
    listMeetings,
    requireWorkspaceMembership,
} from "@/lib/server/store";
import {
    MAX_AUDIO_UPLOAD_FILE_BYTES,
    getAudioUploadTooLargeMessage,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    let user;
    let workspaceId;
    try {
        user = await requireRequestUser(request);
        workspaceId = requireWorkspaceId(request);
        await requireWorkspaceMembership(user.id, workspaceId);
    } catch (error) {
        return authErrorResponse(error);
    }

    const items = await listMeetings(workspaceId);
    for (const item of items) {
        if (
            item.status === "uploaded" ||
            item.status === "transcribing" ||
            item.status === "summarizing"
        ) {
            startMeetingProcessing(item.jobId);
        }
    }
    return NextResponse.json({ items });
}

export async function POST(request: Request) {
    let workspaceId;
    try {
        const user = await requireRequestUser(request);
        workspaceId = requireWorkspaceId(request);
        await requireWorkspaceMembership(user.id, workspaceId);
    } catch (error) {
        return authErrorResponse(error);
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "오디오 파일이 필요합니다." },
                { status: 400 },
            );
        }

        if (file.size > MAX_AUDIO_UPLOAD_FILE_BYTES) {
            return NextResponse.json(
                { error: getAudioUploadTooLargeMessage() },
                { status: 400 },
            );
        }

        if (!isSupportedAudioFile(file)) {
            return NextResponse.json(
                { error: "지원하지 않는 오디오 형식입니다." },
                { status: 400 },
            );
        }

        const sourceType = normalizeSourceType(formData.get("sourceType"));
        const title =
            normalizeString(formData.get("title")) ||
            stripFileExtension(file.name) ||
            "제목 없는 회의";
        const language = normalizeString(formData.get("language")) || "ko";
        const durationSec = normalizeDuration(formData.get("durationSec"));
        const promptTemplateId = normalizePromptTemplate(
            formData.get("promptTemplateId"),
        );
        const tags = normalizeTags(formData.get("tags"));

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const response = await createMeeting({
            workspaceId,
            fileBuffer,
            fileName: file.name || `${title}.webm`,
            title,
            language,
            sourceType,
            tags,
            promptTemplateId,
            durationSec,
        });

        startMeetingProcessing(response.jobId, {
            uploadedAudio: {
                fileBuffer,
            },
        });

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return uploadErrorResponse(error);
    }
}

function normalizeString(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeDuration(value: FormDataEntryValue | null): number | null {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function normalizeTags(value: FormDataEntryValue | null): string[] {
    if (typeof value !== "string" || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function normalizeSourceType(
    value: FormDataEntryValue | null,
): MeetingSourceType {
    return value === "browser_recording" ? "browser_recording" : "upload";
}

function normalizePromptTemplate(value: FormDataEntryValue | null) {
    if (typeof value !== "string") {
        return defaultPromptTemplateId;
    }

    return (
        promptTemplateIds.find((item) => item === value) ??
        defaultPromptTemplateId
    );
}

function stripFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

function isSupportedAudioFile(file: File): boolean {
    return (
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name)
    );
}

function authErrorResponse(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
        return NextResponse.json(
            { error: "인증이 필요합니다." },
            { status: 401 },
        );
    }
    if (message === "MissingWorkspace") {
        return NextResponse.json(
            { error: "워크스페이스를 선택해주세요." },
            { status: 400 },
        );
    }
    if (message === "Forbidden") {
        return NextResponse.json(
            { error: "이 워크스페이스에 대한 접근 권한이 없습니다." },
            { status: 403 },
        );
    }
    return NextResponse.json({ error: message }, { status: 400 });
}

function uploadErrorResponse(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Storage upload failed")) {
        return NextResponse.json({ error: message }, { status: 500 });
    }

    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        return NextResponse.json({ error: message }, { status: 500 });
    }

    if (message.includes("NEXT_PUBLIC_SUPABASE_URL")) {
        return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
}
