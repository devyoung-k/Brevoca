"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, FileAudio, FileText, Sparkles, ChevronRight } from "lucide-react";
import { ErrorState, ErrorType } from "@/components/ErrorState";

type ProcessingStep = "upload" | "transcribe" | "organize" | "summarize" | "complete";

interface StepInfo {
  id: ProcessingStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime: string;
}

const steps: StepInfo[] = [
  { id: "upload", label: "업로드 완료", icon: CheckCircle, estimatedTime: "완료" },
  { id: "transcribe", label: "음성 전사 중", icon: FileAudio, estimatedTime: "약 1-3분" },
  { id: "organize", label: "내용 정리 중", icon: FileText, estimatedTime: "약 30초" },
  { id: "summarize", label: "요약 생성 중", icon: Sparkles, estimatedTime: "약 30초" },
  { id: "complete", label: "완료", icon: CheckCircle, estimatedTime: "완료" },
];

export default function Processing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("upload");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ErrorType | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "오디오 파일 업로드 완료 (제조라인 개선 회의.mp3, 42.3MB)",
    "오디오 품질 검증 완료",
  ]);

  useEffect(() => {
    if (error) return;

    // Simulate processing
    const stepSequence: ProcessingStep[] = ["upload", "transcribe", "organize", "summarize", "complete"];
    let stepIndex = 0;
    let progressValue = 0;

    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex >= stepSequence.length) {
        clearInterval(stepInterval);
        setTimeout(() => {
          router.push(`/meeting/${id || 'new'}`);
        }, 1000);
        return;
      }

      const newStep = stepSequence[stepIndex];
      setCurrentStep(newStep);

      // Add logs
      if (newStep === "transcribe") {
        setLogs((prev) => [...prev, "전사 시작 - Whisper Large v3 모델 사용", "화자 분리 진행 중..."]);
      } else if (newStep === "organize") {
        setLogs((prev) => [...prev, "전사 완료 - 45분 30초 분량", "문맥 분석 및 구조화 시작"]);
      } else if (newStep === "summarize") {
        setLogs((prev) => [...prev, "핵심 내용 추출 중", "액션아이템 및 결정사항 정리 중"]);
      } else if (newStep === "complete") {
        setLogs((prev) => [...prev, "요약 생성 완료", "모든 처리 완료 - 결과 페이지로 이동합니다"]);
      }
    }, 3000);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      progressValue += 0.5;
      setProgress(progressValue);
      if (progressValue >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [router, id, error]);

  const getStepStatus = (step: ProcessingStep): "complete" | "active" | "pending" => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const stepIndex = steps.findIndex((s) => s.id === step);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const handleRetry = () => {
    setError(null);
    setCurrentStep("upload");
    setProgress(0);
    setLogs([
      "오디오 파일 업로드 완료 (제조라인 개선 회의.mp3, 42.3MB)",
      "오디오 품질 검증 완료",
      "재시도 중...",
    ]);
  };

  // Demo: simulate error button (for demonstration)
  const simulateError = () => {
    const errorTypes: ErrorType[] = ["transcription_failed", "summary_failed", "provider_error", "timeout"];
    setError(errorTypes[Math.floor(Math.random() * errorTypes.length)]);
    setLogs((prev) => [...prev, "오류 발생 - 처리가 중단되었습니다"]);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-[var(--graphite-950)]" />
          </div>
          <h1 className="text-3xl font-bold mb-2">회의를 처리하고 있습니다</h1>
          <p className="text-[var(--text-secondary)]">
            AI가 회의를 분석하고 정리하는 중입니다. 잠시만 기다려주세요.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8">
            <ErrorState
              type={error}
              onRetry={handleRetry}
              onDismiss={() => setError(null)}
              onSupport={() => router.push("/settings")}
            />
          </div>
        )}

        {/* Overall Progress */}
        <div className="mb-8 p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--text-secondary)]">전체 진행률</span>
            <span className="text-sm font-mono text-[var(--mint-500)]">{Math.min(progress, 100).toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-[var(--graphite-800)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                error
                  ? "bg-[var(--danger-500)]"
                  : "bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)]"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {!error && currentStep !== "complete" && (
            <p className="text-sm text-[var(--text-secondary)] mt-3">
              예상 남은 시간: 약 {currentStep === "transcribe" ? "2-3분" : currentStep === "organize" ? "1분" : "30초"}
            </p>
          )}
        </div>

        {/* Step Stepper */}
        <div className="mb-8 p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;

              return (
                <div key={step.id}>
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        status === "complete"
                          ? "bg-[var(--mint-500)]/10 text-[var(--mint-500)]"
                          : status === "active"
                          ? error
                            ? "bg-[var(--danger-500)]/10 text-[var(--danger-500)]"
                            : "bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)]"
                          : "bg-[var(--graphite-800)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {status === "active" && !error ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1">
                      <div
                        className={`font-medium mb-1 ${
                          status === "pending" ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {status === "complete" ? "완료" : status === "active" ? (error ? "오류 발생" : "진행 중...") : step.estimatedTime}
                      </div>
                    </div>

                    {/* Status Icon */}
                    {status === "complete" && <CheckCircle className="w-5 h-5 text-[var(--mint-500)]" />}
                    {status === "active" && !error && (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-[var(--mint-500)] animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-[var(--sky-500)] animate-pulse delay-75" />
                        <div className="w-2 h-2 rounded-full bg-[var(--mint-500)] animate-pulse delay-150" />
                      </div>
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="ml-6 my-2">
                      <div
                        className={`w-0.5 h-6 ${
                          status === "complete" ? "bg-[var(--mint-500)]" : "bg-[var(--graphite-800)]"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Processing Logs */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">처리 로그</h3>
            {/* Demo: Error simulation button */}
            {!error && currentStep !== "complete" && (
              <button
                onClick={simulateError}
                className="px-3 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] border border-[var(--line-soft)] hover:border-[var(--danger-500)] hover:text-[var(--danger-500)] transition-colors"
              >
                에러 시뮬레이션
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-[var(--text-secondary)]">
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--mint-500)]" />
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {error ? "오류를 해결한 후 다시 시도해주세요" : "처리가 완료되면 자동으로 결과 페이지로 이동합니다"}
        </div>
      </div>
    </div>
  );
}
