"use client";

import type { ReactNode } from "react";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    Clock,
    Download,
    FileAudio,
    Loader2,
    Save,
    Share2,
    Tag,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { MeetingDetail, TranscriptSegment } from "@brevoca/contracts";
import { TagEditor } from "@/components/TagEditor";
import { ExportDocxDialog } from "@/components/ExportDocxDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { authedFetch } from "@/lib/client/authed-fetch";

export default function MeetingDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [draftTitle, setDraftTitle] = useState("");
    const [savingTitle, setSavingTitle] = useState(false);
    const [savingTags, setSavingTags] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function loadMeeting() {
            try {
                const response = await authedFetch(`/api/meetings/${id}`);
                if (!response.ok) {
                    throw new Error(await extractServerError(response));
                }

                const payload = (await response.json()) as MeetingDetail;
                if (!mounted) {
                    return;
                }

                setMeeting(payload);
                setDraftTitle(payload.title);
                setLoadingError(null);
            } catch (error) {
                if (!mounted) {
                    return;
                }

                setMeeting(null);
                setLoadingError(
                    error instanceof Error
                        ? error.message
                        : "회의 정보를 불러오지 못했습니다.",
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void loadMeeting();
        return () => {
            mounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (!meeting) {
            return;
        }

        setDraftTitle(meeting.title);
    }, [meeting]);

    const handleShare = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        toast.success("공유 링크를 클립보드에 복사했습니다.");
    };

    const handleSaveTitle = async () => {
        if (!meeting) {
            return;
        }

        const nextTitle = draftTitle.trim();
        if (!nextTitle) {
            toast.error("회의 제목을 입력해주세요.");
            return;
        }

        if (nextTitle === meeting.title) {
            return;
        }

        try {
            setSavingTitle(true);
            const updated = await patchMeeting({ title: nextTitle });
            setMeeting(updated);
            toast.success("회의 제목을 저장했습니다.");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "회의 제목을 저장하지 못했습니다.";
            toast.error(message);
        } finally {
            setSavingTitle(false);
        }
    };

    const handleTagsChange = async (nextTags: string[]) => {
        if (!meeting) {
            return;
        }

        const previousTags = meeting.tags;
        setMeeting({ ...meeting, tags: nextTags });
        setSavingTags(true);

        try {
            const updated = await patchMeeting({ tags: nextTags });
            setMeeting(updated);
        } catch (error) {
            setMeeting((current) =>
                current ? { ...current, tags: previousTags } : current,
            );
            const message =
                error instanceof Error
                    ? error.message
                    : "태그를 저장하지 못했습니다.";
            toast.error(message);
        } finally {
            setSavingTags(false);
        }
    };

    const handleDelete = async () => {
        if (!meeting) {
            return;
        }

        try {
            setDeleting(true);

            const response = await authedFetch(`/api/meetings/${meeting.id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error(await extractServerError(response));
            }

            toast.success("회의를 삭제했습니다.");
            router.replace("/dashboard");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "회의를 삭제하지 못했습니다.";
            toast.error(message);
            setDeleting(false);
        }
    };

    async function patchMeeting(patch: {
        title?: string;
        tags?: string[];
    }): Promise<MeetingDetail> {
        const response = await authedFetch(`/api/meetings/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        });
        if (!response.ok) {
            throw new Error(await extractServerError(response));
        }

        const payload = (await response.json()) as { meeting: MeetingDetail };
        return payload.meeting;
    }

    if (loading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="max-w-4xl mx-auto rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] p-12 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>회의를 불러오는 중입니다...</span>
                </div>
            </div>
        );
    }

    if (!meeting) {
        const isNotFound = loadingError === "회의를 찾을 수 없습니다.";
        return (
            <div className="p-6 lg:p-8">
                <div className="max-w-4xl mx-auto rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] p-12 text-center">
                    <AlertCircle className="w-10 h-10 text-[var(--danger-500)] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">
                        {isNotFound
                            ? "회의를 찾을 수 없습니다"
                            : "회의 정보를 불러오지 못했습니다"}
                    </h1>
                    <p className="text-[var(--text-secondary)] mb-6">
                        {isNotFound
                            ? "삭제되었거나 아직 처리가 완료되지 않았을 수 있습니다."
                            : (loadingError ?? "잠시 후 다시 시도해주세요.")}
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        대시보드로 돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    const isTitleDirty =
        draftTitle.trim() !== "" && draftTitle.trim() !== meeting.title;
    const titleHelperText =
        draftTitle.trim() === ""
            ? "회의 제목은 비워둘 수 없습니다."
            : isTitleDirty
              ? "제목이 변경되었습니다. 저장 버튼을 눌러 반영하세요."
              : "현재 제목이 저장되어 있습니다.";

    return (
        <div className="min-h-full">
            <div className="border-b border-[var(--line-soft)] bg-[var(--bg-surface)]/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>대시보드로 돌아가기</span>
                    </Link>

                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={draftTitle}
                                    onChange={(event) =>
                                        setDraftTitle(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void handleSaveTitle();
                                        }
                                    }}
                                    disabled={savingTitle || deleting}
                                    className="w-full rounded-[var(--radius-lg)] border border-[var(--line-soft)] bg-[var(--bg-surface)] px-4 py-3 text-2xl lg:text-3xl font-bold outline-none transition-colors focus:border-[var(--mint-500)] disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label="회의 제목"
                                />
                                <button
                                    onClick={() => {
                                        void handleSaveTitle();
                                    }}
                                    disabled={
                                        !isTitleDirty || savingTitle || deleting
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] px-4 py-3 text-[var(--graphite-950)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingTitle ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    <span>
                                        {savingTitle
                                            ? "저장 중..."
                                            : "이름 저장"}
                                    </span>
                                </button>
                            </div>

                            <p className="text-sm text-[var(--text-secondary)]">
                                {titleHelperText}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-[var(--text-secondary)]">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDate(meeting.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileAudio className="w-4 h-4" />
                                    <span className="font-mono">
                                        {formatDuration(meeting.durationSec)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    <span>
                                        {meeting.sourceType ===
                                        "browser_recording"
                                            ? "브라우저 녹음"
                                            : "파일 업로드"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => {
                                    void handleShare();
                                }}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] hover:bg-[var(--bg-surface)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Share2 className="w-4 h-4" />
                                <span className="hidden sm:inline">공유</span>
                            </button>
                            <button
                                onClick={() => setExportDialogOpen(true)}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    내보내기
                                </span>
                            </button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        disabled={deleting}
                                        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--danger-500)]/40 text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {deleting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        <span className="hidden sm:inline">
                                            {deleting ? "삭제 중..." : "삭제"}
                                        </span>
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            회의를 삭제할까요?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            삭제된 회의는 복구할 수 없습니다.
                                            전사문, 요약, 원본 파일 정보도 함께
                                            제거됩니다.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deleting}>
                                            취소
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            disabled={deleting}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                void handleDelete();
                                            }}
                                            className="bg-[var(--danger-500)] text-white hover:bg-[var(--danger-500)]/90"
                                        >
                                            삭제
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    <div className="rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div>
                                <h2 className="font-medium">태그 관리</h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    워크스페이스에서 검색과 분류에 사용할 태그를
                                    관리합니다.
                                </p>
                            </div>
                            <span className="text-sm text-[var(--text-secondary)]">
                                {savingTags
                                    ? "태그 저장 중..."
                                    : "변경 시 자동 저장"}
                            </span>
                        </div>
                        <TagEditor
                            initialTags={meeting.tags}
                            onTagsChange={(nextTags) => {
                                void handleTagsChange(nextTags);
                            }}
                            disabled={savingTags || deleting}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
                <section className="space-y-6">
                    <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
                        <h2 className="text-xl mb-4">회의록</h2>
                        <article className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed">
                            {meeting.summary?.markdown ??
                                "요약이 아직 생성되지 않았습니다."}
                        </article>
                    </div>

                    <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
                        <h2 className="text-xl mb-4">전사문</h2>
                        {meeting.transcriptSegments?.length ? (
                            <SpeakerTranscript
                                segments={meeting.transcriptSegments}
                            />
                        ) : (
                            <article className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed">
                                {meeting.transcriptText ??
                                    "전사문이 아직 생성되지 않았습니다."}
                            </article>
                        )}
                    </div>
                </section>

                <aside className="space-y-6">
                    <SummaryCard title="주요 결정 사항 및 다음 단계">
                        {meeting.summary?.nextSteps?.length ? (
                            <div className="space-y-3">
                                {meeting.summary.nextSteps.map(
                                    (item, index) => (
                                        <div
                                            key={`${item.content}-${index}`}
                                            className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)]"
                                        >
                                            <div className="font-medium mb-2">
                                                {item.content}
                                            </div>
                                            {(item.assignee ||
                                                item.dueDate) && (
                                                <div className="text-sm text-[var(--text-secondary)]">
                                                    {item.assignee &&
                                                        `담당: ${item.assignee}`}
                                                    {item.assignee &&
                                                        item.dueDate &&
                                                        " / "}
                                                    {item.dueDate &&
                                                        `기한: ${item.dueDate}`}
                                                </div>
                                            )}
                                        </div>
                                    ),
                                )}
                            </div>
                        ) : (
                            <p className="text-[var(--text-secondary)]">
                                해당 없음
                            </p>
                        )}
                    </SummaryCard>

                    {meeting.summary?.topics?.map((topic, index) => (
                        <SummaryCard
                            key={`${topic.title}-${index}`}
                            title={topic.title}
                        >
                            <div className="space-y-2">
                                {topic.points.map((point, pointIndex) => (
                                    <div
                                        key={`${point}-${pointIndex}`}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="text-[var(--text-secondary)] mt-0.5 flex-shrink-0">
                                            •
                                        </span>
                                        <p className="text-[var(--text-secondary)] leading-relaxed">
                                            {point}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </SummaryCard>
                    ))}
                </aside>
            </div>

            <ExportDocxDialog
                meeting={meeting}
                open={exportDialogOpen}
                onOpenChange={setExportDialogOpen}
            />
        </div>
    );
}

function SpeakerTranscript({ segments }: { segments: TranscriptSegment[] }) {
    const speakerLabels = buildSpeakerLabelMap(segments);

    return (
        <div className="space-y-3">
            {segments.map((segment, index) => {
                const label = getTranscriptSpeakerLabel(
                    segment.speaker,
                    speakerLabels,
                );

                return (
                    <div
                        key={`${segment.startSec}-${segment.endSec}-${index}`}
                        className="rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-[var(--graphite-800)] p-4"
                    >
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-[var(--mint-500)]">
                                {label ?? "화자 미상"}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                                {formatTimestamp(segment.startSec)} -{" "}
                                {formatTimestamp(segment.endSec)}
                            </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed">
                            {segment.text}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function getTranscriptSpeakerLabel(
    speaker: string | null,
    labels: Map<string, string>,
): string | null {
    if (!speaker) {
        return null;
    }

    return labels.get(speaker) ?? null;
}

function buildSpeakerLabelMap(
    segments: TranscriptSegment[],
): Map<string, string> {
    const labels = new Map<string, string>();
    let speakerIndex = 0;

    for (const segment of segments) {
        const speaker = segment.speaker?.trim();
        if (!speaker || labels.has(speaker)) {
            continue;
        }

        speakerIndex += 1;
        labels.set(speaker, `화자 ${String.fromCharCode(64 + speakerIndex)}`);
    }

    return labels;
}

function SummaryCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
            <h2 className="text-xl mb-4">{title}</h2>
            {children}
        </div>
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatDuration(durationSec: number | null): string {
    if (!durationSec || durationSec < 1) {
        return "--:--";
    }

    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimestamp(value: number): string {
    const safeValue = Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : 0;
    const minutes = Math.floor(safeValue / 60);
    const seconds = safeValue % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function extractServerError(response: Response): Promise<string> {
    try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
            return payload.error;
        }
    } catch {
        // Ignore JSON parse failures and fall back to status text.
    }

    return response.statusText || "요청을 처리하지 못했습니다.";
}
