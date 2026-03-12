"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Share2,
  Clock,
  Users,
  FileAudio,
  CheckCircle,
  AlertCircle,
  Tag,
  Columns,
  LayoutList,
} from "lucide-react";
import { TagEditor } from "@/components/TagEditor";
import { toast } from "sonner";

// Mock data
const mockMeeting = {
  id: "1",
  title: "제조라인 개선 회의",
  date: "2026-03-12 14:30",
  duration: "45:30",
  language: "한국어",
  participants: ["김팀장", "이과장", "박대리"],
  status: "completed",
  tags: ["제조", "개선", "A라인"],
  transcript: [
    {
      timestamp: "00:00",
      speaker: "김팀장",
      text: "오늘은 A라인의 생산성 개선 방안에 대해 논의하겠습니다. 지난주 데이터를 보면 목표 대비 15% 부족한 상황입니다.",
    },
    {
      timestamp: "00:45",
      speaker: "이과장",
      text: "설비 가동률 자체는 양호한데, 교체 시간이 예상보다 길어지는 게 주요 원인으로 보입니다. 평균 20분 정도 소요되고 있습니다.",
    },
    {
      timestamp: "01:30",
      speaker: "박대리",
      text: "현장에서 확인한 결과, 공구 준비가 미흡한 경우가 많았습니다. 표준 체크리스트를 만들어서 사전 준비를 강화하면 10분 정도는 단축 가능할 것 같습니다.",
    },
    {
      timestamp: "02:15",
      speaker: "김팀장",
      text: "좋습니다. 박대리님이 이번 주 금요일까지 체크리스트 초안을 작성해 주시고, 다음 주 월요일에 현장 테스트를 진행하겠습니다.",
    },
    {
      timestamp: "03:00",
      speaker: "이과장",
      text: "교육도 필요할 것 같습니다. 신규 인력들이 절차를 잘 모르는 경우가 있어서요.",
    },
    {
      timestamp: "03:30",
      speaker: "김팀장",
      text: "맞습니다. 이과장님이 교육 자료를 준비해 주시고, 다음 주 화요일에 전체 교육을 진행하겠습니다. 그럼 정리하면, 체크리스트 작성, 현장 테스트, 교육 진행 순서로 가겠습니다.",
    },
  ],
  summary: {
    overview:
      "제조 A라인의 생산성이 목표 대비 15% 부족한 상황에서 개선 방안을 논의했습니다. 주요 원인은 설비 교체 시간이 평균 20분으로 길어지는 것이며, 공구 준비 미흡이 핵심 요인으로 확인되었습니다.",
    decisions: [
      "표준 체크리스트를 만들어 교체 시간을 10분 단축한다",
      "다음 주 월요일에 현장 테스트를 진행한다",
      "다음 주 화요일에 전체 인력 대상 교육을 실시한다",
    ],
    actionItems: [
      {
        task: "공구 준비 체크리스트 초안 작성",
        assignee: "박대리",
        deadline: "2026-03-14 (금)",
        priority: "high",
      },
      {
        task: "현장 테스트 진행 및 결과 보고",
        assignee: "박대리",
        deadline: "2026-03-17 (월)",
        priority: "high",
      },
      {
        task: "교육 자료 준비",
        assignee: "이과장",
        deadline: "2026-03-17 (월)",
        priority: "medium",
      },
      {
        task: "전체 인력 교육 실시",
        assignee: "이과장",
        deadline: "2026-03-18 (화)",
        priority: "medium",
      },
    ],
    risks: [
      "신규 인력의 절차 이해도가 낮아 추가 교육 시간이 필요할 수 있음",
      "체크리스트 도입 초기에는 오히려 시간이 더 걸릴 가능성이 있음",
    ],
  },
};

const priorityConfig = {
  high: { label: "높음", color: "var(--danger-500)" },
  medium: { label: "보통", color: "var(--signal-orange-500)" },
  low: { label: "낮음", color: "var(--mist-300)" },
};

const speakerColors: Record<string, string> = {
  "김팀장": "var(--mint-500)",
  "이과장": "var(--sky-500)",
  "박대리": "var(--signal-orange-500)",
};

type ViewMode = "summary" | "transcript" | "split";

export default function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");

  const handleShare = () => {
    toast.success("공유 링크가 클립보드에 복사되었습니다.");
  };

  const handleExport = () => {
    toast.success("Markdown 형식으로 내보내기를 시작합니다.");
  };

  const TranscriptView = () => (
    <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
      <h2 className="text-xl mb-6">전사문</h2>
      <div className="space-y-6">
        {mockMeeting.transcript.map((segment, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-shrink-0 w-16 lg:w-20 text-right">
              <div className="font-mono text-sm text-[var(--text-secondary)]">{segment.timestamp}</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="px-3 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: `${speakerColors[segment.speaker] || "var(--graphite-800)"}15`,
                    color: speakerColors[segment.speaker] || "var(--text-secondary)",
                  }}
                >
                  {segment.speaker}
                </div>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">{segment.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SummaryView = () => (
    <div className="space-y-6">
      <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
        <h2 className="text-xl mb-4">회의 개요</h2>
        <p className="text-[var(--text-secondary)] leading-relaxed">{mockMeeting.summary.overview}</p>
      </div>

      <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
        <h2 className="text-xl mb-4">결정사항</h2>
        <div className="space-y-3">
          {mockMeeting.summary.decisions.map((decision, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--mint-500)] flex-shrink-0 mt-0.5" />
              <p className="text-[var(--text-secondary)]">{decision}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
        <h2 className="text-xl mb-4">액션아이템</h2>
        <div className="space-y-3">
          {mockMeeting.summary.actionItems.map((item, index) => {
            const config = priorityConfig[item.priority as keyof typeof priorityConfig];
            return (
              <div
                key={index}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] hover:border-[var(--mint-500)] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{item.task}</h4>
                  <div
                    className="px-2 py-1 rounded text-xs flex-shrink-0 ml-2"
                    style={{
                      backgroundColor: `${config.color}15`,
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{item.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono">{item.deadline}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
        <h2 className="text-xl mb-4">미결사항 / 리스크</h2>
        <div className="space-y-3">
          {mockMeeting.summary.risks.map((risk, index) => (
            <div key={index} className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--signal-orange-500)] flex-shrink-0 mt-0.5" />
              <p className="text-[var(--text-secondary)]">{risk}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[var(--line-soft)] bg-[var(--bg-surface)]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>대시보드로 돌아가기</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold mb-3">{mockMeeting.title}</h1>

              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{mockMeeting.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4" />
                  <span className="font-mono">{mockMeeting.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{mockMeeting.participants.join(", ")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">공유</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">내보내기</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <TagEditor initialTags={mockMeeting.tags} />
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-[var(--line-soft)] bg-[var(--bg-surface)]/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-4 lg:px-6 py-3 border-b-2 transition-colors ${
                viewMode === "summary"
                  ? "border-[var(--mint-500)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              요약
            </button>
            <button
              onClick={() => setViewMode("transcript")}
              className={`px-4 lg:px-6 py-3 border-b-2 transition-colors ${
                viewMode === "transcript"
                  ? "border-[var(--mint-500)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              전사문
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`hidden lg:flex items-center gap-2 px-4 lg:px-6 py-3 border-b-2 transition-colors ${
                viewMode === "split"
                  ? "border-[var(--mint-500)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Columns className="w-4 h-4" />
              분할 보기
            </button>
          </div>

          {/* View toggle for mobile hint */}
          <div className="lg:hidden text-xs text-[var(--text-secondary)] pr-2">
            데스크톱에서 분할 보기 가능
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {viewMode === "summary" && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Overview */}
              <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
                <h2 className="text-xl mb-4">회의 개요</h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">{mockMeeting.summary.overview}</p>
              </div>

              {/* Decisions */}
              <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
                <h2 className="text-xl mb-4">결정사항</h2>
                <div className="space-y-3">
                  {mockMeeting.summary.decisions.map((decision, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[var(--mint-500)] flex-shrink-0 mt-0.5" />
                      <p className="text-[var(--text-secondary)]">{decision}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
                <h2 className="text-xl mb-4">미결사항 / 리스크</h2>
                <div className="space-y-3">
                  {mockMeeting.summary.risks.map((risk, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[var(--signal-orange-500)] flex-shrink-0 mt-0.5" />
                      <p className="text-[var(--text-secondary)]">{risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Action Items */}
            <div>
              <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
                <h2 className="text-xl mb-4">액션아이템</h2>
                <div className="space-y-3">
                  {mockMeeting.summary.actionItems.map((item, index) => {
                    const config = priorityConfig[item.priority as keyof typeof priorityConfig];
                    return (
                      <div
                        key={index}
                        className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] hover:border-[var(--mint-500)] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{item.task}</h4>
                          <div
                            className="px-2 py-1 rounded text-xs flex-shrink-0 ml-2"
                            style={{
                              backgroundColor: `${config.color}15`,
                              color: config.color,
                            }}
                          >
                            {config.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>{item.assignee}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-mono">{item.deadline}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "transcript" && (
          <div className="max-w-4xl">
            <TranscriptView />
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Summary */}
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <SummaryView />
            </div>
            {/* Right: Transcript */}
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <TranscriptView />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
