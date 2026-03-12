"use client";

import { useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Filter, Calendar, Tag, Clock, FileAudio, ArrowRight } from "lucide-react";

// Mock data
const mockSearchResults = [
  {
    id: "1",
    title: "제조라인 개선 회의",
    date: "2026-03-12 14:30",
    duration: "45:30",
    status: "completed",
    tags: ["제조", "개선", "A라인"],
    excerpt: "생산성이 목표 대비 15% 부족한 상황에서 개선 방안을 논의했습니다...",
  },
  {
    id: "2",
    title: "안전 점검 브리핑",
    date: "2026-03-12 10:00",
    duration: "32:15",
    status: "completed",
    tags: ["안전", "점검"],
    excerpt: "3월 안전 점검 결과를 공유하고 개선사항을 논의했습니다...",
  },
  {
    id: "3",
    title: "주간 생산 계획 회의",
    date: "2026-03-11 16:00",
    duration: "58:42",
    status: "completed",
    tags: ["생산", "계획", "주간"],
    excerpt: "다음 주 생산 계획과 자재 수급 현황을 검토했습니다...",
  },
  {
    id: "5",
    title: "품질 개선 TF 미팅",
    date: "2026-03-09 13:00",
    duration: "41:20",
    status: "completed",
    tags: ["품질", "개선", "TF"],
    excerpt: "불량률 감소를 위한 공정 개선안을 논의했습니다...",
  },
];

const filterTags = ["전체", "제조", "안전", "품질", "계획", "개선"];

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState("all");

  const toggleTag = (tag: string) => {
    if (tag === "전체") {
      setSelectedTags([]);
    } else {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">검색 / 보관함</h1>
        <p className="text-[var(--text-secondary)]">
          회의를 검색하고 다시 꺼내보세요.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="회의 제목, 내용, 참석자로 검색..."
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
          <div className="flex flex-wrap gap-2">
            {filterTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-[var(--radius-md)] text-sm transition-colors ${
                  tag === "전체"
                    ? selectedTags.length === 0
                      ? "bg-[var(--graphite-800)] text-[var(--text-primary)] border border-[var(--mint-500)]"
                      : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    : selectedTags.includes(tag)
                    ? "bg-[var(--sky-500)]/20 text-[var(--sky-500)] border border-[var(--sky-500)]"
                    : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] overflow-hidden">
        <div className="p-6 border-b border-[var(--line-soft)] flex items-center justify-between">
          <h2 className="text-xl">검색 결과</h2>
          <div className="text-sm text-[var(--text-secondary)]">
            총 {mockSearchResults.length}개의 회의
          </div>
        </div>

        <div className="divide-y divide-[var(--line-soft)]">
          {mockSearchResults.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meeting/${meeting.id}`}
              className="block p-6 bg-[var(--bg-surface)] border-b border-[var(--line-soft)] hover:bg-[var(--bg-surface-strong)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg">{meeting.title}</h3>
                    <div className="px-3 py-1 rounded-full bg-[var(--mint-500)]/15 text-[var(--mint-500)] text-xs">
                      완료
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                    {meeting.excerpt}
                  </p>

                  <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)] mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileAudio className="w-4 h-4" />
                      <span className="font-mono">{meeting.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {meeting.tags.map((tag) => (
                      <div
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-[var(--graphite-800)] text-xs text-[var(--text-secondary)]"
                      >
                        #{tag}
                      </div>
                    ))}
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-[var(--text-secondary)] ml-4 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {mockSearchResults.length === 0 && (
        <div className="rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--graphite-800)] flex items-center justify-center mx-auto mb-4">
            <SearchIcon className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-xl mb-2">검색 결과가 없습니다</h3>
          <p className="text-[var(--text-secondary)]">
            다른 키워드로 검색하거나 필터를 조정해 보세요.
          </p>
        </div>
      )}
    </div>
  );
}
