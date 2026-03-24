'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  ChevronRight,
  FileAudio,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { JobRecord, ProcessingErrorType } from '@brevoca/contracts';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ErrorState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { authedFetch } from '@/lib/client/authed-fetch';

type StepId = 'upload' | 'transcribe' | 'summarize' | 'complete';
type StepStatus = 'complete' | 'active' | 'pending' | 'failed' | 'stopped';

const steps = [
  { id: 'upload' as const, label: '업로드 완료', icon: CheckCircle },
  { id: 'transcribe' as const, label: '음성 전사 중', icon: FileAudio },
  { id: 'summarize' as const, label: '회의록 요약 중', icon: Sparkles },
  { id: 'complete' as const, label: '완료', icon: CheckCircle },
];

export default function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    async function loadJob() {
      try {
        const response = await authedFetch(`/api/jobs/${id}`);
        if (!response.ok) {
          throw new Error(await extractServerError(response));
        }

        const nextJob = (await response.json()) as JobRecord;
        if (!mounted) {
          return;
        }

        setNow(Date.now());
        setJob(nextJob);
        setLoading(false);
        setLoadingError(null);

        if (nextJob.status === 'completed') {
          router.replace(`/meeting/${nextJob.meetingId}`);
          return;
        }

        if (nextJob.status === 'queued' || nextJob.status === 'processing') {
          timer = window.setTimeout(() => {
            void loadJob();
          }, 2000);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setLoading(false);
        setLoadingError(
          error instanceof Error
            ? error.message
            : '처리 상태를 불러오지 못했습니다.',
        );
      }
    }

    void loadJob();

    return () => {
      mounted = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [id, reloadKey, router]);

  useEffect(() => {
    if (!job) {
      return;
    }

    if (job.status !== 'queued' && job.status !== 'processing') {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [job]);

  const handleReload = () => {
    setLoading(true);
    setLoadingError(null);
    setReloadKey((current) => current + 1);
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);

      const response = await authedFetch(`/api/jobs/${id}/retry`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(await extractServerError(response));
      }

      const refreshed = await authedFetch(`/api/jobs/${id}`);
      if (!refreshed.ok) {
        throw new Error(await extractServerError(refreshed));
      }

      setNow(Date.now());
      setJob((await refreshed.json()) as JobRecord);
      setLoadingError(null);
      setReloadKey((current) => current + 1);
      toast.success('재처리를 다시 시작했습니다.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '재처리를 시작하지 못했습니다.';
      toast.error(message);
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCanceling(true);

      const response = await authedFetch(`/api/jobs/${id}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(await extractServerError(response));
      }

      const refreshed = await authedFetch(`/api/jobs/${id}`);
      if (!refreshed.ok) {
        throw new Error(await extractServerError(refreshed));
      }

      setNow(Date.now());
      setJob((await refreshed.json()) as JobRecord);
      setLoadingError(null);
      setReloadKey((current) => current + 1);
      toast.success('처리를 중단했습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '처리를 중단하지 못했습니다.';
      toast.error(message);
    } finally {
      setCanceling(false);
    }
  };

  const handleDelete = async () => {
    if (!job) {
      return;
    }

    try {
      setDeleting(true);

      const response = await authedFetch(`/api/meetings/${job.meetingId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(await extractServerError(response));
      }

      toast.success('회의를 삭제했습니다.');
      router.replace('/dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '회의를 삭제하지 못했습니다.';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] p-12 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>처리 상태를 불러오는 중입니다...</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] p-12 text-center">
          <AlertCircle className="w-10 h-10 text-[var(--danger-500)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            처리 상태를 불러오지 못했습니다
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            {loadingError ??
              '작업이 삭제되었거나 접근 권한이 없을 수 있습니다.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleReload}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity"
            >
              <Loader2 className="w-4 h-4" />
              다시 불러오기
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] border border-[var(--line-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-strong)] hover:text-[var(--text-primary)] transition-colors"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const errorType: ProcessingErrorType = job.errorType ?? 'provider_error';
  const elapsedMs = getElapsedMs(job, now);
  const viewModel = getProcessingViewModel(job);
  const canCancel = job.status === 'queued' || job.status === 'processing';
  const canDelete =
    job.status === 'queued' ||
    job.status === 'processing' ||
    job.status === 'failed' ||
    job.status === 'canceled';

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-[var(--graphite-950)]" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{viewModel.title}</h1>
          <p className="text-[var(--text-secondary)]">
            {viewModel.description}
          </p>
        </div>

        {loadingError && (
          <div className="mb-8 rounded-[var(--radius-xl)] border border-[var(--danger-500)]/30 bg-[var(--danger-500)]/5 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[var(--text-secondary)]">
                최신 처리 상태를 동기화하지 못했습니다. 마지막으로 받은 정보를
                표시하고 있습니다.
              </p>
              <button
                onClick={handleReload}
                className="rounded-[var(--radius-md)] border border-[var(--line-strong)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-strong)] hover:text-[var(--text-primary)]"
              >
                다시 동기화
              </button>
            </div>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="mb-8">
            <ErrorState
              type={errorType}
              onRetry={() => {
                void handleRetry();
              }}
              onDismiss={() => router.push('/dashboard')}
            />
          </div>
        )}

        <div className="mb-8 p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <span className="text-sm text-[var(--text-secondary)]">
                전체 진행률
              </span>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                진행 시간{' '}
                <span className="font-mono text-[var(--text-primary)]">
                  {formatElapsedMs(elapsedMs)}
                </span>
              </div>
            </div>
            <span className="text-sm font-mono text-[var(--mint-500)]">
              {job.progress}%
            </span>
          </div>
          <div className="h-3 bg-[var(--graphite-800)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${viewModel.progressClassName}`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-3">
            {viewModel.progressMessage}
          </p>
        </div>

        {(canCancel || canDelete) && (
          <div className="mb-8 flex flex-wrap justify-end gap-3">
            {canCancel && (
              <button
                onClick={() => {
                  void handleCancel();
                }}
                disabled={canceling}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger-500)]/40 px-4 py-2 text-[var(--danger-500)] transition-colors hover:bg-[var(--danger-500)]/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canceling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                <span>{canceling ? '처리 중단 중...' : '처리 중단'}</span>
              </button>
            )}

            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] px-4 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>{deleting ? '삭제 중...' : '회의 삭제'}</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>회의를 삭제할까요?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. 진행 중인 처리 결과와 저장된
                      회의 데이터가 함께 삭제됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      취소
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDelete();
                      }}
                      className="bg-[var(--danger-500)] text-white hover:bg-[var(--danger-500)]/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        <div className="mb-8 p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const status = getStepStatus(job, step.id);
              const Icon = step.icon;

              return (
                <div key={step.id}>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        status === 'complete'
                          ? 'bg-[var(--mint-500)]/10 text-[var(--mint-500)]'
                          : status === 'active'
                            ? 'bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)]'
                            : status === 'failed'
                              ? 'bg-[var(--danger-500)]/10 text-[var(--danger-500)]'
                              : status === 'stopped'
                                ? 'bg-[var(--signal-orange-500)]/10 text-[var(--signal-orange-500)]'
                                : 'bg-[var(--graphite-800)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {status === 'active' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : status === 'stopped' ? (
                        <Ban className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium mb-1">{step.label}</div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {getStepStatusLabel(status)}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="ml-6 my-2">
                      <div
                        className={`w-0.5 h-6 ${
                          status === 'complete'
                            ? 'bg-[var(--mint-500)]'
                            : status === 'failed'
                              ? 'bg-[var(--danger-500)]'
                              : status === 'stopped'
                                ? 'bg-[var(--signal-orange-500)]'
                                : 'bg-[var(--graphite-800)]'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">처리 로그</h3>
            {retrying && (
              <span className="text-sm text-[var(--text-secondary)]">
                재처리 요청 중...
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-sm">
            {job.logs.map((log, index) => (
              <div
                key={`${log}-${index}`}
                className={`flex items-start gap-2 ${
                  isProblemLog(log)
                    ? 'text-[var(--danger-500)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    isProblemLog(log)
                      ? 'text-[var(--danger-500)]'
                      : 'text-[var(--mint-500)]'
                  }`}
                />
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getProcessingViewModel(job: JobRecord) {
  if (job.status === 'failed') {
    return {
      title: '처리 중 오류가 발생했습니다',
      description: '재처리하거나 회의를 삭제할 수 있습니다.',
      progressClassName: 'bg-[var(--danger-500)]',
      progressMessage: job.errorMessage || '처리 중 오류가 발생했습니다.',
    };
  }

  if (job.status === 'canceled') {
    return {
      title: '처리가 중단되었습니다',
      description:
        '현재 회의는 더 이상 처리되지 않습니다. 필요하면 다시 업로드하거나 삭제할 수 있습니다.',
      progressClassName: 'bg-[var(--signal-orange-500)]',
      progressMessage: '처리가 중단되었습니다.',
    };
  }

  if (job.status === 'completed') {
    return {
      title: '처리가 완료되었습니다',
      description: '결과 페이지로 곧 이동합니다.',
      progressClassName:
        'bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)]',
      progressMessage: '완료되었습니다. 결과 페이지로 이동합니다.',
    };
  }

  return {
    title:
      job.status === 'queued'
        ? '처리를 준비하고 있습니다'
        : '회의를 처리하고 있습니다',
    description: 'AI가 전사와 회의록 요약을 순차적으로 생성하는 중입니다.',
    progressClassName:
      'bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)]',
    progressMessage: '처리가 완료되면 자동으로 결과 페이지로 이동합니다.',
  };
}

function getCurrentStep(job: JobRecord): StepId {
  if (job.status === 'completed') {
    return 'complete';
  }

  if (job.stage === 'summarize') {
    return 'summarize';
  }

  return 'transcribe';
}

function getStepStatus(job: JobRecord, step: StepId): StepStatus {
  const order: StepId[] = ['upload', 'transcribe', 'summarize', 'complete'];
  const currentStep = getCurrentStep(job);
  const currentIndex = order.indexOf(currentStep);
  const stepIndex = order.indexOf(step);

  if (stepIndex === 0) {
    return 'complete';
  }

  if (job.status === 'completed' && step === 'complete') {
    return 'complete';
  }

  if (job.status === 'failed' && stepIndex === currentIndex) {
    return 'failed';
  }

  if (job.status === 'canceled' && stepIndex === currentIndex) {
    return 'stopped';
  }

  if (stepIndex < currentIndex) {
    return 'complete';
  }

  if (
    stepIndex === currentIndex &&
    (job.status === 'queued' || job.status === 'processing')
  ) {
    return 'active';
  }

  return 'pending';
}

function getStepStatusLabel(status: StepStatus): string {
  if (status === 'complete') {
    return '완료';
  }

  if (status === 'active') {
    return '진행 중...';
  }

  if (status === 'failed') {
    return '오류 발생';
  }

  if (status === 'stopped') {
    return '중단됨';
  }

  return '대기 중';
}

function getElapsedMs(job: JobRecord, now: number): number {
  const startAt = Date.parse(job.createdAt);

  if (!Number.isFinite(startAt)) {
    return 0;
  }

  const isActive = job.status === 'queued' || job.status === 'processing';
  const endAt = isActive ? now : Date.parse(job.updatedAt);
  const safeEndAt = Number.isFinite(endAt) ? endAt : now;

  return Math.max(0, safeEndAt - startAt);
}

function formatElapsedMs(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function isProblemLog(log: string): boolean {
  const lower = log.toLowerCase();

  return (
    lower.includes('오류') ||
    lower.includes('실패') ||
    lower.includes('중단') ||
    lower.includes('취소') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('http 4') ||
    lower.includes('http 5') ||
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('forbidden') ||
    lower.includes('unauthorized')
  );
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

  return response.statusText || '요청을 처리하지 못했습니다.';
}
