import { randomUUID } from "crypto";
import "server-only";

import {
    promptTemplateIds,
    type ProcessingErrorType,
} from "@brevoca/contracts";
import {
    summarizeTranscript,
    type SummaryProgressCallback,
    transcribeAudioFile,
    type TranscribeProgressCallback,
} from "./openai";
import { getWorkspaceGlossaryText } from "./workspaces";
import {
    acquireJobLease,
    completeProcessing,
    downloadMeetingAudio,
    getJob,
    getStoredMeetingByJob,
    markStageStarted,
    releaseJobLease,
    resetJobForRetry,
    renewJobLease,
    saveTranscriptionResult,
    setProcessingCanceled,
    setProcessingFailure,
    updateJob,
} from "./store";

type ActiveJob = {
    controller: AbortController;
    promise: Promise<void>;
};

const activeJobs = new Map<string, ActiveJob>();
const jobMutationQueues = new Map<string, Promise<void>>();
const PROCESSOR_ID = randomUUID();
const JOB_LEASE_TTL_MS = 45_000;
const JOB_LEASE_RENEW_INTERVAL_MS = 15_000;

interface StartMeetingProcessingOptions {
    uploadedAudio?: {
        fileBuffer: Buffer;
    };
}

export function startMeetingProcessing(
    jobId: string,
    options?: StartMeetingProcessingOptions,
): void {
    if (activeJobs.has(jobId)) {
        return;
    }

    const controller = new AbortController();
    const promise = runMeetingProcessing(jobId, controller, options).finally(
        () => {
            activeJobs.delete(jobId);
        },
    );

    activeJobs.set(jobId, { controller, promise });
    void promise;
}

export async function retryMeetingProcessing(jobId: string): Promise<void> {
    await resetJobForRetry(jobId);
    startMeetingProcessing(jobId);
}

export async function cancelMeetingProcessing(jobId: string): Promise<void> {
    const activeJob = activeJobs.get(jobId);
    if (activeJob) {
        activeJob.controller.abort(new Error("Processing canceled by user"));
        await activeJob.promise.catch(() => {});
        return;
    }

    await setProcessingCanceled(jobId);
}

async function processMeeting(
    jobId: string,
    signal: AbortSignal,
    options?: StartMeetingProcessingOptions,
): Promise<void> {
    const [storedMeeting, currentJob] = await Promise.all([
        getStoredMeetingByJob(jobId),
        getJob(jobId),
    ]);
    if (!storedMeeting || !currentJob) {
        throw new Error(`Meeting for job ${jobId} not found`);
    }

    const promptTemplateId = promptTemplateIds.includes(
        storedMeeting.promptTemplateId as (typeof promptTemplateIds)[number],
    )
        ? storedMeeting.promptTemplateId
        : promptTemplateIds[0];
    const glossaryText = await getWorkspaceGlossaryText(storedMeeting.workspaceId);
    let stage: "transcribe" | "summarize" =
        currentJob.stage === "summarize" && storedMeeting.transcriptText
            ? "summarize"
            : "transcribe";

    try {
        let transcriptText = storedMeeting.transcriptText ?? "";
        let transcriptSegments = storedMeeting.transcriptSegments;
        let transcriptChunks: string[] | undefined;

        if (stage === "transcribe") {
            await ensureJobCanContinue(jobId, signal);
            await markStageStarted(
                jobId,
                "transcribing",
                "transcribe",
                15,
                "전사 준비를 시작합니다",
            );

            if (
                !options?.uploadedAudio?.fileBuffer &&
                !storedMeeting.storageKey
            ) {
                throw new Error("Meeting audio is missing from storage.");
            }

            let fileBuffer: Buffer;
            if (options?.uploadedAudio?.fileBuffer) {
                fileBuffer = options.uploadedAudio.fileBuffer;
                await appendJobLog(
                    jobId,
                    "업로드된 오디오를 사용해 Storage 다운로드를 생략합니다",
                );
            } else {
                await appendJobLog(
                    jobId,
                    "Storage에서 회의 오디오 다운로드를 시작합니다",
                );
                fileBuffer = await downloadMeetingAudio(
                    storedMeeting.storageKey!,
                    storedMeeting.audioChunkCount,
                );
                await appendJobLog(
                    jobId,
                    storedMeeting.audioChunkCount > 1
                        ? `Storage에서 ${storedMeeting.audioChunkCount}개 청크 다운로드 및 병합을 완료했습니다`
                        : "Storage에서 회의 오디오 다운로드를 완료했습니다",
                    20,
                );
            }

            const onTranscribeProgress: TranscribeProgressCallback = (
                progress,
                message,
            ) => appendJobLog(jobId, message, progress);

            const transcript = await transcribeAudioFile({
                fileBuffer,
                fileName: storedMeeting.fileName || `${storedMeeting.id}.webm`,
                language: storedMeeting.language,
                durationSec: storedMeeting.durationSec,
                glossaryText,
                signal,
                onProgress: onTranscribeProgress,
            });

            throwIfAborted(signal);
            await ensureJobCanContinue(jobId, signal);
            transcriptText = transcript.transcriptText;
            transcriptSegments = transcript.transcriptSegments;
            transcriptChunks = transcript.transcriptChunks;
            await saveTranscriptionResult(
                jobId,
                transcriptText,
                transcriptSegments,
            );
            await appendJobLog(jobId, "전사 완료", 55);
        }

        await ensureJobCanContinue(jobId, signal);
        await markStageStarted(
            jobId,
            "summarizing",
            "summarize",
            70,
            stage === "summarize" && storedMeeting.transcriptText
                ? "저장된 전사 결과로 OpenAI 요약을 재개합니다"
                : "OpenAI 요약을 시작합니다",
        );
        stage = "summarize";

        const onSummaryProgress: SummaryProgressCallback = (progress, message) =>
            appendJobLog(jobId, message, progress);

        const summary = await summarizeTranscript({
            title: storedMeeting.title,
            language: storedMeeting.language,
            transcriptText,
            transcriptChunks,
            promptTemplateId,
            glossaryText,
            signal,
            onProgress: onSummaryProgress,
        });

        throwIfAborted(signal);
        await ensureJobCanContinue(jobId, signal);
        await completeProcessing(
            jobId,
            transcriptText,
            transcriptSegments,
            summary,
        );
    } catch (error) {
        if (isLeaseLostError(error) || isProcessingStoppedError(error)) {
            return;
        }

        if (isAbortError(error)) {
            await setProcessingCanceled(jobId);
            return;
        }

        const message = error instanceof Error ? error.message : String(error);
        await setProcessingFailure(
            jobId,
            stage,
            message,
            classifyError(message, stage),
        );
    }
}

async function runMeetingProcessing(
    jobId: string,
    controller: AbortController,
    options?: StartMeetingProcessingOptions,
): Promise<void> {
    const acquired = await acquireJobLease(
        jobId,
        PROCESSOR_ID,
        JOB_LEASE_TTL_MS,
    );
    if (!acquired) {
        return;
    }

    const stopHeartbeat = startLeaseHeartbeat(jobId, controller);
    try {
        await processMeeting(jobId, controller.signal, options);
    } finally {
        stopHeartbeat();
        await releaseJobLease(jobId, PROCESSOR_ID).catch(() => {});
    }
}

function startLeaseHeartbeat(
    jobId: string,
    controller: AbortController,
): () => void {
    let polling = false;
    const timer = setInterval(() => {
        if (polling || controller.signal.aborted) {
            return;
        }

        polling = true;
        void Promise.all([
            renewJobLease(jobId, PROCESSOR_ID, JOB_LEASE_TTL_MS),
            getJob(jobId),
        ])
            .then(([renewed, job]) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (!renewed) {
                    controller.abort(new ProcessingLeaseLostError());
                    return;
                }

                if (!job) {
                    controller.abort(
                        new ProcessingStoppedError(`Job ${jobId} not found`),
                    );
                    return;
                }

                if (job.status === "canceled") {
                    controller.abort(new Error("Processing canceled by user"));
                    return;
                }

                if (job.status === "completed" || job.status === "failed") {
                    controller.abort(
                        new ProcessingStoppedError(
                            `Job ${jobId} is no longer active (${job.status})`,
                        ),
                    );
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    controller.abort(new ProcessingLeaseLostError());
                }
            })
            .finally(() => {
                polling = false;
            });
    }, JOB_LEASE_RENEW_INTERVAL_MS);

    return () => {
        clearInterval(timer);
    };
}

class ProcessingLeaseLostError extends Error {
    constructor() {
        super("Processing lease was lost");
        this.name = "ProcessingLeaseLostError";
    }
}

class ProcessingStoppedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProcessingStoppedError";
    }
}

function isLeaseLostError(error: unknown): boolean {
    return error instanceof ProcessingLeaseLostError;
}

function isProcessingStoppedError(error: unknown): boolean {
    return error instanceof ProcessingStoppedError;
}

async function ensureJobCanContinue(
    jobId: string,
    signal: AbortSignal,
): Promise<void> {
    throwIfAborted(signal);
    const job = await getJob(jobId);
    if (!job) {
        throw new ProcessingStoppedError(`Job ${jobId} not found`);
    }

    if (job.status === "canceled") {
        throw new Error("Processing canceled by user");
    }

    if (job.status === "completed" || job.status === "failed") {
        throw new ProcessingStoppedError(
            `Job ${jobId} is no longer active (${job.status})`,
        );
    }
}

function classifyError(
    message: string,
    stage: "transcribe" | "summarize",
): ProcessingErrorType {
    const lower = message.toLowerCase();

    if (
        lower.includes("timeout") ||
        lower.includes("http 408") ||
        message.includes("시간 안에 완료되지")
    ) {
        return "timeout";
    }

    if (
        lower.includes("network") ||
        lower.includes("bad gateway") ||
        lower.includes("gateway") ||
        lower.includes("http 502") ||
        lower.includes("http 504") ||
        lower.includes("fetch failed") ||
        lower.includes("econnreset") ||
        lower.includes("socket hang up") ||
        lower.includes("failed to download meeting audio") ||
        message.includes("네트워크 오류") ||
        message.includes("연결에 실패") ||
        message.includes("연결이 재설정") ||
        message.includes("연결을 종료")
    ) {
        return "network_error";
    }

    if (
        lower.includes("api key") ||
        lower.includes("unauthorized") ||
        lower.includes("quota") ||
        lower.includes("http 4") ||
        lower.includes("http 5") ||
        lower.includes("the server had an error processing your request") ||
        lower.includes("help.openai.com") ||
        lower.includes("please include the request id") ||
        lower.includes("request id") ||
        lower.includes("server had an error")
    ) {
        return "provider_error";
    }

    return stage === "transcribe" ? "transcription_failed" : "summary_failed";
}

async function appendJobLog(
    jobId: string,
    message: string,
    progress?: number,
): Promise<void> {
    await runSerializedJobMutation(jobId, async () => {
        const job = await getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        await updateJob(jobId, {
            stage: job.stage,
            status: job.status,
            progress: typeof progress === "number" ? progress : job.progress,
            logs: [...job.logs, message],
        });
    });
}

async function runSerializedJobMutation(
    jobId: string,
    mutation: () => Promise<void>,
): Promise<void> {
    const previous = jobMutationQueues.get(jobId) ?? Promise.resolve();
    let releaseCurrent!: () => void;
    const current = new Promise<void>((resolve) => {
        releaseCurrent = resolve;
    });
    const queued = previous.catch(() => undefined).then(() => current);
    jobMutationQueues.set(jobId, queued);

    await previous.catch(() => undefined);

    try {
        await mutation();
    } finally {
        releaseCurrent();
        if (jobMutationQueues.get(jobId) === queued) {
            jobMutationQueues.delete(jobId);
        }
    }
}

function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
        throw signal.reason instanceof Error
            ? signal.reason
            : new Error("Processing canceled by user");
    }
}

function isAbortError(error: unknown): boolean {
    if (!error) {
        return false;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            error.name === "AbortError" ||
            message.includes("canceled") ||
            message.includes("abort")
        );
    }

    return false;
}
