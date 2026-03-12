"use client";

import { useState } from "react";
import { Building2, Users, FileText, Download, Zap, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";

// Mock data
const mockMembers = [
  { id: "1", name: "김팀장", email: "kim@company.com", role: "관리자" },
  { id: "2", name: "이과장", email: "lee@company.com", role: "멤버" },
  { id: "3", name: "박대리", email: "park@company.com", role: "멤버" },
];

export default function Settings() {
  const [workspaceName, setWorkspaceName] = useState("제조팀 워크스페이스");
  const [defaultLanguage, setDefaultLanguage] = useState("ko");
  const [defaultTemplate, setDefaultTemplate] = useState("manufacturing");
  const [exportFormat, setExportFormat] = useState("markdown");
  const [inviteEmail, setInviteEmail] = useState("");

  const handleSave = () => {
    toast.success("설정이 저장되었습니다.");
  };

  const handleInvite = () => {
    if (inviteEmail) {
      toast.success(`${inviteEmail}에게 초대를 보냈습니다.`);
      setInviteEmail("");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">설정</h1>
        <p className="text-[var(--text-secondary)]">
          워크스페이스와 기본 설정을 관리하세요.
        </p>
      </div>

      <div className="space-y-6">
        {/* Workspace Settings */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-[var(--mint-500)]" />
            <h2 className="text-xl">워크스페이스 정보</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">워크스페이스 이름</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">워크스페이스 설명</label>
              <textarea
                rows={3}
                placeholder="이 워크스페이스에 대한 설명을 입력하세요"
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-[var(--sky-500)]" />
            <h2 className="text-xl">팀 멤버</h2>
          </div>

          {/* Invite Section */}
          <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)]">
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--graphite-900)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors"
              />
              <button
                onClick={handleInvite}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>초대</span>
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            {mockMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)] hover:bg-[var(--graphite-900)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] flex items-center justify-center text-[var(--graphite-950)] font-semibold">
                    {member.name[0]}
                  </div>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-[var(--graphite-900)] text-sm text-[var(--text-secondary)]">
                    {member.role}
                  </div>
                  {member.role !== "관리자" && (
                    <button className="p-2 rounded-lg hover:bg-[var(--graphite-900)] text-[var(--text-secondary)] hover:text-[var(--danger-500)] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Default Settings */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-[var(--signal-orange-500)]" />
            <h2 className="text-xl">기본 설정</h2>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">기본 언어</label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">기본 템플릿</label>
                <select
                  value={defaultTemplate}
                  onChange={(e) => setDefaultTemplate(e.target.value)}
                  className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors"
                >
                  <option value="general">일반 회의</option>
                  <option value="manufacturing">제조/현장 회의</option>
                  <option value="brainstorm">브레인스토밍</option>
                  <option value="oneonone">1:1 미팅</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Export Settings */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Download className="w-5 h-5 text-[var(--mint-500)]" />
            <h2 className="text-xl">내보내기 설정</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">기본 내보내기 형식</label>
              <div className="grid grid-cols-3 gap-3">
                {["markdown", "docx", "pdf"].map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-4 py-3 rounded-[var(--radius-md)] text-sm transition-colors ${
                      exportFormat === format
                        ? "bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)]"
                        : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {format === "markdown" && "Markdown (.md)"}
                    {format === "docx" && "Word (.docx)"}
                    {format === "pdf" && "PDF (.pdf)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)]">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="include-transcript"
                  defaultChecked
                  className="mt-1 w-4 h-4 rounded border-[var(--line-soft)] bg-[var(--graphite-900)] checked:bg-[var(--mint-500)]"
                />
                <div>
                  <label htmlFor="include-transcript" className="block font-medium mb-1 cursor-pointer">
                    전사문 포함
                  </label>
                  <p className="text-sm text-[var(--text-secondary)]">
                    내보내기 시 전체 전사문을 함께 포함합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)]">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="include-timestamps"
                  defaultChecked
                  className="mt-1 w-4 h-4 rounded border-[var(--line-soft)] bg-[var(--graphite-900)] checked:bg-[var(--mint-500)]"
                />
                <div>
                  <label htmlFor="include-timestamps" className="block font-medium mb-1 cursor-pointer">
                    타임스탬프 포함
                  </label>
                  <p className="text-sm text-[var(--text-secondary)]">
                    각 발언에 시간 정보를 표시합니다
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Settings */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-[var(--sky-500)]" />
            <h2 className="text-xl">AI 제공자 설정</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">전사 제공자</label>
              <select className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors">
                <option>Whisper (OpenAI)</option>
                <option>Google Cloud Speech-to-Text</option>
                <option>Azure Speech Services</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">요약 제공자</label>
              <select className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors">
                <option>GPT-4 (OpenAI)</option>
                <option>Claude (Anthropic)</option>
                <option>Gemini (Google)</option>
              </select>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--signal-orange-500)]/10 border border-[var(--signal-orange-500)]/20">
              <p className="text-sm text-[var(--text-secondary)]">
                💡 제공자 설정을 변경하면 다음 회의부터 적용됩니다. 기존 회의에는 영향을 주지 않습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            <span>설정 저장</span>
          </button>
          <button className="px-6 py-3 rounded-[var(--radius-md)] border border-[var(--line-strong)] hover:bg-[var(--bg-surface-strong)] transition-colors">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}