import { useState, useEffect, useRef } from "react";
import { Search, Clock, FileAudio, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MeetingRecord } from "@brevoca/contracts";
import { authedFetch } from "@/lib/client/authed-fetch";
import { useAppSession } from "@/components/AppSessionProvider";

export function GlobalSearch() {
  const { currentWorkspace } = useAppSession();
  return (
    <GlobalSearchContent key={currentWorkspace?.id ?? "no-workspace"} workspaceId={currentWorkspace?.id ?? null} />
  );
}

function GlobalSearchContent({ workspaceId }: { workspaceId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(workspaceId !== null);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedMeetings = workspaceId ? meetings : [];
  const resolvedLoading = workspaceId ? loading : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      // Cmd/Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        containerRef.current?.querySelector("input")?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    authedFetch("/api/meetings")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("회의 목록을 불러오지 못했습니다.");
        }

        const payload = (await response.json()) as { items: MeetingRecord[] };
        if (!cancelled) {
          setMeetings(payload.items.slice(0, 8));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMeetings([]);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/meetings?q=${encodeURIComponent(query)}`);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredMeetings = normalizedQuery
    ? resolvedMeetings.filter((meeting) => {
        const haystack = [
          meeting.title,
          ...meeting.tags,
          meeting.sourceType === "browser_recording" ? "브라우저 녹음" : "파일 업로드",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : resolvedMeetings;
  const footerHref = query.trim()
    ? `/meetings?q=${encodeURIComponent(query.trim())}`
    : "/meetings";

  return (
    <div className="relative" ref={containerRef}>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="회의 목록 검색... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-48 lg:w-64 pl-9 pr-4 py-2 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors text-sm placeholder:text-[var(--text-secondary)]"
          />
        </div>
      </form>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 rounded-[var(--radius-xl)] bg-[var(--bg-surface-strong)] border border-[var(--line-soft)] shadow-2xl z-20 overflow-hidden">
            {resolvedLoading ? (
              <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>회의 목록을 불러오는 중입니다</span>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-[var(--line-soft)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2">
                    <Clock className="w-3 h-3" />
                    <span>{query ? "일치하는 회의" : "최근 회의"}</span>
                  </div>
                </div>

                <div className="p-2 max-h-64 overflow-y-auto">
                  {filteredMeetings.length > 0 ? (
                    filteredMeetings.slice(0, 5).map((meeting) => (
                      <Link
                        key={meeting.id}
                        href={getMeetingHref(meeting)}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <FileAudio className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{meeting.title}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {formatDate(meeting.createdAt)}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-[var(--text-secondary)]">
                      {query
                        ? `"${query}"와 일치하는 회의가 없습니다. Enter로 전체 목록에서 확인하세요.`
                        : "표시할 회의가 없습니다."}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-[var(--line-soft)]">
                  <Link
                    href={footerHref}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface)] transition-colors text-sm text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    전체 회의 보기
                  </Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
