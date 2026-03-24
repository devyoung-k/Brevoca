"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search as SearchIcon,
  Calendar,
  Tag,
  Clock,
  FileAudio,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { MeetingRecord } from "@brevoca/contracts";
import { authedFetch } from "@/lib/client/authed-fetch";
import { useAppSession } from "@/components/AppSessionProvider";

type DateFilter = "all" | "today" | "week" | "month";

const statusConfig: Record<
  MeetingRecord["status"],
  { label: string; color: string }
> = {
  uploaded: { label: "업로드 완료", color: "var(--mist-300)" },
  transcribing: { label: "전사 중", color: "var(--sky-500)" },
  summarizing: { label: "요약 중", color: "var(--sky-500)" },
  completed: { label: "완료", color: "var(--mint-500)" },
  failed: { label: "실패", color: "var(--danger-500)" },
  canceled: { label: "중단됨", color: "var(--mist-300)" },
};

export default function Search() {
  const { currentWorkspace } = useAppSession();
  const searchParams = useSearchParams();
  return (
    <SearchContent
      key={`${currentWorkspace?.id ?? "no-workspace"}:${searchParams.get("q")?.trim() ?? ""}`}
      initialQuery={searchParams.get("q")?.trim() ?? ""}
      workspaceId={currentWorkspace?.id ?? null}
    />
  );
}

function SearchContent({
  initialQuery,
  workspaceId,
}: {
  initialQuery: string;
  workspaceId: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(workspaceId !== null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const resolvedMeetings = workspaceId ? meetings : [];
  const resolvedLoading = workspaceId ? loading : false;
  const resolvedLoadingError = workspaceId ? loadingError : null;

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    authedFetch("/api/meetings")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await extractServerError(response));
        }

        const payload = (await response.json()) as { items: MeetingRecord[] };
        if (!cancelled) {
          setMeetings(payload.items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMeetings([]);
          setLoadingError(
            error instanceof Error
              ? error.message
              : "회의 목록을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const availableTags = Array.from(
    new Set(resolvedMeetings.flatMap((meeting) => meeting.tags)),
  ).sort((left, right) => left.localeCompare(right, "ko-KR"));
  const activeSelectedTags = selectedTags.filter((tag) =>
    availableTags.includes(tag),
  );

  const toggleTag = (tag: string) => {
    if (tag === "전체") {
      setSelectedTags([]);
      return;
    }

    setSelectedTags((prev) => {
      const next = prev.filter((item) => availableTags.includes(item));
      return next.includes(tag)
        ? next.filter((item) => item !== tag)
        : [...next, tag];
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMeetings = resolvedMeetings.filter((meeting) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [meeting.title, ...meeting.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesTags =
      activeSelectedTags.length === 0 ||
      activeSelectedTags.every((tag) => meeting.tags.includes(tag));

    return matchesQuery && matchesTags && matchesDateFilter(meeting, dateFilter);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">회의 목록</h1>
        <p className="text-[var(--text-secondary)]">
          워크스페이스의 회의를 검색하고 상태를 확인하세요.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="회의 제목 또는 태그로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 grid md:grid-cols-2 gap-4">
        {/* Date Filter */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[var(--mint-500)]" />
            <h3 className="font-medium">날짜 필터</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "today", "week", "month"].map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-4 py-2 rounded-[var(--radius-md)] text-sm transition-colors ${
                  dateFilter === period
                    ? "bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)]"
                    : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {period === "all" && "전체"}
                {period === "today" && "오늘"}
                {period === "week" && "이번 주"}
                {period === "month" && "이번 달"}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Filter */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-[var(--sky-500)]" />
            <h3 className="font-medium">태그 필터</h3>
          </div>
          {availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {["전체", ...availableTags].map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-[var(--radius-md)] text-sm transition-colors ${
                    tag === "전체"
                      ? activeSelectedTags.length === 0
                        ? "bg-[var(--graphite-800)] text-[var(--text-primary)] border border-[var(--mint-500)]"
                        : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      : activeSelectedTags.includes(tag)
                        ? "bg-[var(--sky-500)]/20 text-[var(--sky-500)] border border-[var(--sky-500)]"
                        : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              태그가 지정된 회의가 아직 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] overflow-hidden">
        <div className="p-6 border-b border-[var(--line-soft)] flex items-center justify-between">
          <h2 className="text-xl">회의 목록</h2>
          <div className="text-sm text-[var(--text-secondary)]">
            총 {resolvedMeetings.length}개 중 {filteredMeetings.length}개 표시
          </div>
        </div>

        {resolvedLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[var(--text-secondary)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>회의 목록을 불러오는 중입니다.</span>
          </div>
        ) : resolvedLoadingError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-[var(--danger-500)]" />
            <h3 className="text-xl mb-2">회의 목록을 불러오지 못했습니다</h3>
            <p className="text-[var(--text-secondary)]">{resolvedLoadingError}</p>
          </div>
        ) : filteredMeetings.length > 0 ? (
          <div className="divide-y divide-[var(--line-soft)]">
            {filteredMeetings.map((meeting) => {
              const config = statusConfig[meeting.status];
              return (
                <Link
                  key={meeting.id}
                  href={getMeetingHref(meeting)}
                  className="block p-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-strong)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg truncate">{meeting.title}</h3>
                        <div
                          className="px-3 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: `${config.color}15`,
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--text-secondary)] mb-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(meeting.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileAudio className="w-4 h-4" />
                          <span className="font-mono">
                            {formatDuration(meeting.durationSec)}
                          </span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-[var(--graphite-800)] text-xs">
                          {meeting.sourceType === "browser_recording"
                            ? "브라우저 녹음"
                            : "파일 업로드"}
                        </div>
                      </div>

                      {meeting.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {meeting.tags.map((tag) => (
                            <div
                              key={tag}
                              className="px-2.5 py-1 rounded-full bg-[var(--graphite-800)] text-xs text-[var(--text-secondary)]"
                            >
                              #{tag}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <ArrowRight className="w-5 h-5 text-[var(--text-secondary)] ml-4 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--graphite-800)] flex items-center justify-center mx-auto mb-4">
              {resolvedMeetings.length === 0 ? (
                <FileAudio className="w-8 h-8 text-[var(--text-secondary)]" />
              ) : (
                <SearchIcon className="w-8 h-8 text-[var(--text-secondary)]" />
              )}
            </div>
            <h3 className="text-xl mb-2">
              {resolvedMeetings.length === 0
                ? "아직 회의가 없습니다"
                : "조건에 맞는 회의가 없습니다"}
            </h3>
            <p className="text-[var(--text-secondary)]">
              {resolvedMeetings.length === 0
                ? "첫 회의를 업로드하거나 녹음해서 목록을 채워보세요."
                : "검색어나 필터를 조정해 보세요."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getMeetingHref(meeting: MeetingRecord) {
  return meeting.status === "completed" ||
    meeting.status === "failed" ||
    meeting.status === "canceled"
    ? `/meeting/${meeting.id}`
    : `/processing/${meeting.jobId}`;
}

function matchesDateFilter(meeting: MeetingRecord, dateFilter: DateFilter) {
  if (dateFilter === "all") {
    return true;
  }

  const createdAt = new Date(meeting.createdAt);
  const now = new Date();

  if (dateFilter === "today") {
    return formatDateKey(createdAt) === formatDateKey(now);
  }

  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (dateFilter === "week") {
    return diffDays <= 7;
  }

  return diffDays <= 31;
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

function formatDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  return response.statusText || "회의 목록을 불러오지 못했습니다.";
}
