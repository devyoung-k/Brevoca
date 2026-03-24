import { NextResponse } from "next/server";
import { requireRequestUser, requireWorkspaceId } from "@/lib/server/auth";
import {
    cancelMeetingProcessing,
    startMeetingProcessing,
} from "@/lib/server/process-meeting";
import {
    deleteMeetingForWorkspace,
    getStoredMeeting,
    getMeeting,
    requireWorkspaceMembership,
    updateMeeting,
} from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    let workspaceId;
    try {
        const user = await requireRequestUser(request);
        workspaceId = requireWorkspaceId(request);
        await requireWorkspaceMembership(user.id, workspaceId);
    } catch (error) {
        return authErrorResponse(error);
    }

    const { id } = await context.params;
    const meeting = await getMeeting(id, workspaceId);

    if (!meeting) {
        return NextResponse.json(
            { error: "회의를 찾을 수 없습니다." },
            { status: 404 },
        );
    }

    if (
        meeting.status === "uploaded" ||
        meeting.status === "transcribing" ||
        meeting.status === "summarizing"
    ) {
        startMeetingProcessing(meeting.jobId);
    }

    return NextResponse.json(meeting);
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    let workspaceId;
    try {
        const user = await requireRequestUser(request);
        workspaceId = requireWorkspaceId(request);
        await requireWorkspaceMembership(user.id, workspaceId);
    } catch (error) {
        return authErrorResponse(error);
    }

    const { id } = await context.params;
    const meeting = await getStoredMeeting(id, workspaceId);

    if (!meeting) {
        return NextResponse.json(
            { error: "회의를 찾을 수 없습니다." },
            { status: 404 },
        );
    }

    const isProcessing =
        meeting.status === "uploaded" ||
        meeting.status === "transcribing" ||
        meeting.status === "summarizing";
    if (isProcessing) {
        await cancelMeetingProcessing(meeting.jobId);
    }

    await deleteMeetingForWorkspace(id, workspaceId);
    return new NextResponse(null, { status: 204 });
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    let workspaceId;
    try {
        const user = await requireRequestUser(request);
        workspaceId = requireWorkspaceId(request);
        await requireWorkspaceMembership(user.id, workspaceId);
    } catch (error) {
        return authErrorResponse(error);
    }

    const { id } = await context.params;
    const meeting = await getStoredMeeting(id, workspaceId);

    if (!meeting) {
        return NextResponse.json(
            { error: "회의를 찾을 수 없습니다." },
            { status: 404 },
        );
    }

    let body: {
        title?: string;
        tags?: string[];
    };
    try {
        body = (await request.json()) as {
            title?: string;
            tags?: string[];
        };
    } catch {
        return NextResponse.json(
            { error: "요청 본문 형식이 올바르지 않습니다." },
            { status: 400 },
        );
    }

    const patch: {
        title?: string;
        tags?: string[];
    } = {};

    if (body.title !== undefined) {
        const title = body.title.trim();
        if (!title) {
            return NextResponse.json(
                { error: "회의 제목을 입력해주세요." },
                { status: 400 },
            );
        }
        patch.title = title;
    }

    if (body.tags !== undefined) {
        if (!Array.isArray(body.tags)) {
            return NextResponse.json(
                { error: "태그 형식이 올바르지 않습니다." },
                { status: 400 },
            );
        }

        patch.tags = Array.from(
            new Set(
                body.tags
                    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
                    .filter(Boolean),
            ),
        );
    }

    if (patch.title === undefined && patch.tags === undefined) {
        return NextResponse.json(
            { error: "수정할 항목이 없습니다." },
            { status: 400 },
        );
    }

    const updatedMeeting = await updateMeeting(id, patch);
    return NextResponse.json({ meeting: updatedMeeting });
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
