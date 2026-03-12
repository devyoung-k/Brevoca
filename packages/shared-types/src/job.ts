export const jobTypes = ["transcribe", "summarize", "export"] as const;
export const jobStatuses = [
  "queued",
  "processing",
  "completed",
  "failed",
] as const;

export type JobType = (typeof jobTypes)[number];
export type JobStatus = (typeof jobStatuses)[number];

export interface JobRecord {
  id: string;
  meetingId: string;
  jobType: JobType;
  status: JobStatus;
  progress: number;
  errorMessage?: string | null;
}
