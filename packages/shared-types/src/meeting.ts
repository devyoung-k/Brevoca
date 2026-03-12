export const meetingStatuses = [
  "uploaded",
  "processing",
  "completed",
  "failed",
] as const;

export const meetingSourceTypes = [
  "upload",
  "browser_recording",
  "live",
] as const;

export type MeetingStatus = (typeof meetingStatuses)[number];
export type MeetingSourceType = (typeof meetingSourceTypes)[number];

export interface MeetingSummary {
  markdown: string;
  decisions: string[];
  actionItems: Array<{
    content: string;
    assignee: string | null;
    dueDate: string | null;
  }>;
}

export interface MeetingRecord {
  id: string;
  workspaceId: string;
  title: string;
  status: MeetingStatus;
  sourceType: MeetingSourceType;
  language: string;
  durationSec: number | null;
  createdAt: string;
}
