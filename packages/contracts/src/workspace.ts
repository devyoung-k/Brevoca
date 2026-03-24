import type { PromptTemplateId } from "./prompts";

export const workspaceMemberRoles = ["owner", "member"] as const;
export const workspaceDefaultLanguages = ["ko", "en", "ja", "zh"] as const;
export const workspaceExportFormats = ["markdown", "docx", "pdf"] as const;

export type WorkspaceMemberRole = (typeof workspaceMemberRoles)[number];
export type WorkspaceDefaultLanguage = (typeof workspaceDefaultLanguages)[number];
export type WorkspaceExportFormat = (typeof workspaceExportFormats)[number];

export interface CurrentUser {
  id: string;
  email: string | null;
  defaultWorkspaceId: string | null;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description: string;
  glossaryText: string;
  role: WorkspaceMemberRole;
  defaultLanguage: WorkspaceDefaultLanguage;
  defaultPromptTemplateId: PromptTemplateId;
  defaultExportFormat: WorkspaceExportFormat;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberRecord {
  userId: string;
  email: string | null;
  displayName: string;
  role: WorkspaceMemberRole;
  joinedAt: string;
}

export interface WorkspaceInvitationRecord {
  id: string;
  email: string;
  role: WorkspaceMemberRole;
  invitedByUserId: string;
  createdAt: string;
}

export interface WorkspaceDetailResponse {
  workspace: WorkspaceRecord;
  members: WorkspaceMemberRecord[];
  invitations: WorkspaceInvitationRecord[];
}

export interface CurrentUserResponse {
  user: CurrentUser;
  workspaces: WorkspaceRecord[];
  currentWorkspaceId: string | null;
}

export interface CreateWorkspaceResponse {
  workspace: WorkspaceRecord;
  currentWorkspaceId: string;
}
