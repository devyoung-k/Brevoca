"use client";

import { useEffect, useState } from "react";
import {
  defaultPromptTemplateId,
  promptTemplateLabels,
  promptTemplateIds,
  type PromptTemplateId,
  type WorkspaceDefaultLanguage,
  type WorkspaceDetailResponse,
  type WorkspaceExportFormat,
  type WorkspaceInvitationRecord,
  type WorkspaceMemberRecord,
} from "@brevoca/contracts";
import { Building2, Users, FileText, Download, Save, Plus, X, CheckCircle2, Trash2 } from "lucide-react";
import { useAppSession } from "@/components/AppSessionProvider";
import { authedFetch } from "@/lib/client/authed-fetch";
import { toast } from "sonner";

export default function Settings() {
  const { currentWorkspace, workspaces, createWorkspace, selectWorkspace, deleteWorkspace, refresh, user } = useAppSession();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [glossaryText, setGlossaryText] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<WorkspaceDefaultLanguage>("ko");
  const [defaultTemplate, setDefaultTemplate] = useState<PromptTemplateId>(defaultPromptTemplateId);
  const [exportFormat, setExportFormat] = useState<WorkspaceExportFormat>("markdown");
  const [inviteEmail, setInviteEmail] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitationRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [creatingMemberAccount, setCreatingMemberAccount] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [actingMemberId, setActingMemberId] = useState<string | null>(null);
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);

  const isOwner = currentWorkspace?.role === "owner";

  useEffect(() => {
    setWorkspaceName(currentWorkspace?.name ?? "");
    setWorkspaceDescription(currentWorkspace?.description ?? "");
    setGlossaryText(currentWorkspace?.glossaryText ?? "");
    setDefaultLanguage(currentWorkspace?.defaultLanguage ?? "ko");
    setDefaultTemplate(currentWorkspace?.defaultPromptTemplateId ?? defaultPromptTemplateId);
    setExportFormat(currentWorkspace?.defaultExportFormat ?? "markdown");
  }, [
    currentWorkspace?.defaultExportFormat,
    currentWorkspace?.defaultLanguage,
    currentWorkspace?.defaultPromptTemplateId,
    currentWorkspace?.description,
    currentWorkspace?.glossaryText,
    currentWorkspace?.name,
  ]);

  useEffect(() => {
    if (!currentWorkspace) {
      setMembers([]);
      setInvitations([]);
      return;
    }

    let cancelled = false;
    setLoadingMembers(true);

    void (async () => {
      try {
        const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const payload = (await response.json()) as WorkspaceDetailResponse;
        if (!cancelled) {
          setMembers(payload.members);
          setInvitations(payload.invitations);
        }
      } catch (error) {
        if (!cancelled) {
          setMembers([]);
          setInvitations([]);
          toast.error(error instanceof Error ? error.message : "멤버 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentWorkspace]);

  const handleSave = async () => {
    if (!currentWorkspace) {
      return;
    }

    setSavingWorkspace(true);
    try {
      const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: workspaceName,
          description: workspaceDescription,
          glossaryText,
          defaultLanguage,
          defaultPromptTemplateId: defaultTemplate,
          defaultExportFormat: exportFormat,
        }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      await refresh();
      toast.success("워크스페이스 설정을 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "워크스페이스 저장에 실패했습니다.");
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleInvite = () => {
    if (!currentWorkspace || !inviteEmail.trim()) {
      return;
    }

    setSubmittingInvite(true);
    void (async () => {
      try {
        const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}/invitations`, {
          method: "POST",
          body: JSON.stringify({ email: inviteEmail }),
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const payload = (await response.json()) as { invitation: WorkspaceInvitationRecord };
        setInvitations((current) => [...current, payload.invitation]);
        setInviteEmail("");
        toast.success("초대를 생성했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "초대 생성에 실패했습니다.");
      } finally {
        setSubmittingInvite(false);
      }
    })();
  };

  const handleCreateMemberAccount = () => {
    if (!currentWorkspace) {
      return;
    }

    const email = newMemberEmail.trim();
    if (!email || !newMemberPassword) {
      return;
    }

    setCreatingMemberAccount(true);
    void (async () => {
      try {
        const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}/member-accounts`, {
          method: "POST",
          body: JSON.stringify({
            email,
            password: newMemberPassword,
          }),
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const payload = (await response.json()) as { member: WorkspaceMemberRecord };
        setMembers((current) => {
          if (current.some((item) => item.userId === payload.member.userId)) {
            return current;
          }
          return [...current, payload.member];
        });
        setInvitations((current) => current.filter((item) => item.email !== payload.member.email));
        setNewMemberEmail("");
        setNewMemberPassword("");
        toast.success("멤버 계정을 생성했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "멤버 계정 생성에 실패했습니다.");
      } finally {
        setCreatingMemberAccount(false);
      }
    })();
  };

  const handleCreateWorkspace = () => {
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) {
      return;
    }

    setCreatingWorkspace(true);
    void (async () => {
      try {
        await createWorkspace(trimmed);
        setNewWorkspaceName("");
        toast.success("워크스페이스를 생성했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "워크스페이스 생성에 실패했습니다.");
      } finally {
        setCreatingWorkspace(false);
      }
    })();
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) {
      return;
    }

    setSwitchingWorkspaceId(workspaceId);
    void (async () => {
      try {
        await selectWorkspace(workspaceId);
        toast.success("워크스페이스를 전환했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "워크스페이스 전환에 실패했습니다.");
      } finally {
        setSwitchingWorkspaceId(null);
      }
    })();
  };

  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string) => {
    const confirmed = window.confirm(
      `"${workspaceName}" 워크스페이스를 삭제하면 회의, 멤버, 초대 데이터도 함께 삭제됩니다. 계속할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingWorkspaceId(workspaceId);
    void (async () => {
      try {
        await deleteWorkspace(workspaceId);
        setMembers([]);
        setInvitations([]);
        toast.success("워크스페이스를 삭제했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "워크스페이스 삭제에 실패했습니다.");
      } finally {
        setDeletingWorkspaceId(null);
      }
    })();
  };

  const handleRoleChange = (member: WorkspaceMemberRecord, role: "owner" | "member") => {
    if (!currentWorkspace || member.role === role) {
      return;
    }

    setActingMemberId(member.userId);
    void (async () => {
      try {
        const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}/members/${member.userId}`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        setMembers((current) =>
          current.map((item) => (item.userId === member.userId ? { ...item, role } : item)),
        );
        await refresh();
        toast.success("멤버 역할을 변경했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "역할 변경에 실패했습니다.");
      } finally {
        setActingMemberId(null);
      }
    })();
  };

  const handleRemoveMember = (member: WorkspaceMemberRecord) => {
    if (!currentWorkspace) {
      return;
    }

    setActingMemberId(member.userId);
    void (async () => {
      try {
        const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}/members/${member.userId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        setMembers((current) => current.filter((item) => item.userId !== member.userId));
        toast.success("멤버를 제거했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "멤버 제거에 실패했습니다.");
      } finally {
        setActingMemberId(null);
      }
    })();
  };

  const handleRevokeInvitation = (invitation: WorkspaceInvitationRecord) => {
    if (!currentWorkspace) {
      return;
    }

    setActingInvitationId(invitation.id);
    void (async () => {
      try {
        const response = await authedFetch(`/api/workspaces/${currentWorkspace.id}/invitations/${invitation.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
        toast.success("초대를 취소했습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "초대 취소에 실패했습니다.");
      } finally {
        setActingInvitationId(null);
      }
    })();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">워크스페이스 관리</h1>
        <p className="text-[var(--text-secondary)]">워크스페이스 전환, 생성, 멤버 관리를 한 곳에서 처리합니다.</p>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-[var(--mint-500)]" />
            <h2 className="text-xl">내 워크스페이스</h2>
          </div>

          <div className="space-y-3">
            {workspaces.map((workspace) => {
              const isCurrent = workspace.id === currentWorkspace?.id;
              const canDelete = workspace.role === "owner";
              return (
                <div
                  key={workspace.id}
                  className={`flex flex-col gap-4 rounded-[var(--radius-lg)] border p-4 md:flex-row md:items-center md:justify-between ${
                    isCurrent
                      ? "border-[var(--mint-500)]/40 bg-[var(--mint-500)]/5"
                      : "border-[var(--line-soft)] bg-[var(--graphite-900)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] text-sm font-semibold text-[var(--graphite-950)]">
                      {workspace.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium">{workspace.name}</div>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mint-500)]/15 px-2 py-1 text-xs text-[var(--mint-400)]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            현재 사용 중
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {workspace.role === "owner" ? "관리자" : "멤버"} · 생성일 {formatDate(workspace.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <button
                      onClick={() => handleSelectWorkspace(workspace.id)}
                      disabled={isCurrent || switchingWorkspaceId === workspace.id || deletingWorkspaceId === workspace.id}
                      className="rounded-[var(--radius-md)] border border-[var(--line-soft)] px-4 py-2 text-sm transition-colors hover:bg-[var(--graphite-800)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCurrent ? "현재 워크스페이스" : switchingWorkspaceId === workspace.id ? "전환 중..." : "이 워크스페이스로 전환"}
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                        disabled={deletingWorkspaceId === workspace.id || switchingWorkspaceId === workspace.id}
                        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--danger-500)] transition-colors hover:bg-[var(--danger-500)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{deletingWorkspaceId === workspace.id ? "삭제 중..." : "워크스페이스 삭제"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--line-soft)] bg-[var(--graphite-900)] p-4">
            <div className="mb-3 text-sm font-medium">새 워크스페이스 만들기</div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateWorkspace();
                  }
                }}
                placeholder="예: 서울 공장 운영팀"
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-[var(--graphite-800)] px-4 py-3 focus:border-[var(--mint-500)] focus:outline-none transition-colors"
                maxLength={30}
              />
              <button
                onClick={handleCreateWorkspace}
                disabled={creatingWorkspace || !newWorkspaceName.trim()}
                className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] px-4 py-3 text-[var(--graphite-950)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{creatingWorkspace ? "생성 중..." : "워크스페이스 생성"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-[var(--mint-500)]" />
            <h2 className="text-xl">현재 워크스페이스 정보</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">워크스페이스 이름</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={!currentWorkspace}
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">워크스페이스 설명</label>
              <textarea
                rows={3}
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                disabled={!currentWorkspace}
                placeholder="이 워크스페이스에 대한 설명을 입력하세요"
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-[var(--sky-500)]" />
            <h2 className="text-xl">팀 멤버</h2>
          </div>

          <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--graphite-800)] p-4">
            <div className="mb-3">
              <div className="font-medium">새 멤버 계정 생성</div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                공개 회원가입은 막혀 있습니다. 워크스페이스 관리자가 로그인 가능한 계정을 직접 생성합니다.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
              <input
                type="email"
                placeholder="member@company.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateMemberAccount();
                  }
                }}
                className="rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-[var(--graphite-900)] px-4 py-2 focus:border-[var(--mint-500)] focus:outline-none transition-colors"
              />
              <input
                type="password"
                placeholder="임시 비밀번호 (8자 이상)"
                value={newMemberPassword}
                onChange={(e) => setNewMemberPassword(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateMemberAccount();
                  }
                }}
                className="rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-[var(--graphite-900)] px-4 py-2 focus:border-[var(--mint-500)] focus:outline-none transition-colors"
              />
              <button
                onClick={handleCreateMemberAccount}
                disabled={creatingMemberAccount || !isOwner || !newMemberEmail.trim() || newMemberPassword.length < 8}
                className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] px-4 py-2 text-[var(--graphite-950)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{creatingMemberAccount ? "생성 중..." : "계정 생성"}</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {isOwner
                ? "생성된 계정은 현재 워크스페이스 멤버로 바로 연결됩니다."
                : "계정 생성은 워크스페이스 관리자만 할 수 있습니다."}
            </p>
          </div>

          <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)]">
            <div className="mb-3 font-medium">기존 계정 초대</div>
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
                disabled={submittingInvite || !isOwner}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>{submittingInvite ? "초대 중..." : "초대"}</span>
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {isOwner
                ? "이미 생성되어 있는 계정만 초대할 수 있습니다. 초대받은 사용자가 같은 이메일로 로그인하면 자동으로 멤버로 연결됩니다."
                : "멤버 초대는 워크스페이스 관리자만 할 수 있습니다."}
            </p>
          </div>

          {invitations.length > 0 && (
            <div className="mb-6 space-y-2">
              <div className="text-sm text-[var(--text-secondary)]">대기 중인 초대</div>
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-[var(--radius-md)] border border-dashed border-[var(--line-soft)] bg-[var(--graphite-900)]"
                >
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {invitation.role === "owner" ? "관리자" : "멤버"} 초대 대기 중
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRevokeInvitation(invitation)}
                      disabled={actingInvitationId === invitation.id}
                      className="p-2 rounded-lg hover:bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--danger-500)] transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {loadingMembers ? (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)] text-sm text-[var(--text-secondary)]">
                멤버를 불러오는 중입니다.
              </div>
            ) : members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] flex items-center justify-center text-[var(--graphite-950)] font-semibold">
                      {member.displayName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium">{member.displayName}</div>
                      <div className="text-sm text-[var(--text-secondary)]">{member.email ?? "이메일 없음"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOwner && member.userId !== user?.id ? (
                      <select
                        value={member.role}
                        onChange={(event) => handleRoleChange(member, event.target.value as "owner" | "member")}
                        disabled={actingMemberId === member.userId}
                        className="px-3 py-1 rounded-full bg-[var(--graphite-900)] text-sm text-[var(--text-secondary)] border border-[var(--line-soft)]"
                      >
                        <option value="owner">관리자</option>
                        <option value="member">멤버</option>
                      </select>
                    ) : (
                      <div className="px-3 py-1 rounded-full bg-[var(--graphite-900)] text-sm text-[var(--text-secondary)]">
                        {member.role === "owner" ? "관리자" : "멤버"}
                      </div>
                    )}
                    {isOwner && member.userId !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={actingMemberId === member.userId}
                        className="p-2 rounded-lg hover:bg-[var(--graphite-900)] text-[var(--text-secondary)] hover:text-[var(--danger-500)] transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--graphite-800)] text-sm text-[var(--text-secondary)]">
                아직 등록된 멤버가 없습니다. 현재는 워크스페이스 생성자만 멤버로 표시됩니다.
              </div>
            )}
          </div>
        </div>

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
                  onChange={(e) => setDefaultLanguage(e.target.value as WorkspaceDefaultLanguage)}
                  disabled={!currentWorkspace}
                  className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors disabled:opacity-50"
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
                  onChange={(e) => setDefaultTemplate(e.target.value as PromptTemplateId)}
                  disabled={!currentWorkspace}
                  className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors"
                >
                  {promptTemplateIds.map((templateId) => (
                    <option key={templateId} value={templateId}>
                      {promptTemplateLabels[templateId]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

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
                    onClick={() => setExportFormat(format as WorkspaceExportFormat)}
                    disabled={!currentWorkspace}
                    className={`px-4 py-3 rounded-[var(--radius-md)] text-sm transition-colors ${
                      exportFormat === format
                        ? "bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)]"
                        : "bg-[var(--graphite-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {format === "markdown" && "Markdown (.md)"}
                    {format === "docx" && "Word (.docx)"}
                    {format === "pdf" && "PDF (.pdf)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-[var(--sky-500)]" />
            <h2 className="text-xl">단어 사전</h2>
          </div>

          <div>
            <label className="block text-sm mb-2">전사용 용어 사전</label>
            <textarea
              rows={6}
              value={glossaryText}
              onChange={(e) => setGlossaryText(e.target.value)}
              disabled={!currentWorkspace}
              placeholder={"품번\n풍범 => 품번\n이봄 => E-BOM"}
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--graphite-800)] border border-[var(--line-soft)] focus:border-[var(--mint-500)] focus:outline-none transition-colors resize-y disabled:opacity-50 font-mono text-sm"
            />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              한 줄에 하나씩 입력합니다. <code>별칭 =&gt; 표준 용어</code> 형식으로 넣으면 전사 후 자동 보정하고, 표준 용어만 넣으면 전사 힌트로 사용합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              void handleSave();
            }}
            disabled={savingWorkspace || !currentWorkspace}
            className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingWorkspace ? "저장 중..." : "설정 저장"}</span>
          </button>
          <button
            onClick={() => {
              setWorkspaceName(currentWorkspace?.name ?? "");
              setWorkspaceDescription(currentWorkspace?.description ?? "");
              setGlossaryText(currentWorkspace?.glossaryText ?? "");
              setDefaultLanguage(currentWorkspace?.defaultLanguage ?? "ko");
              setDefaultTemplate(currentWorkspace?.defaultPromptTemplateId ?? defaultPromptTemplateId);
              setExportFormat(currentWorkspace?.defaultExportFormat ?? "markdown");
            }}
            className="px-6 py-3 rounded-[var(--radius-md)] border border-[var(--line-strong)] hover:bg-[var(--bg-surface-strong)] transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

async function getResponseError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
