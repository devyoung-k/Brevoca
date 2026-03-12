"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Pause, Play, Trash2, Upload, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export default function BrowserRecording() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio context for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start recording
      setState("recording");
      setDuration(0);

      // Timer
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Audio level animation
      const updateLevel = () => {
        if (analyserRef.current && state !== "stopped") {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("마이크 접근 권한이 필요합니다.");
    }
  };

  const pauseRecording = () => {
    setState("paused");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeRecording = () => {
    setState("recording");
    intervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setState("stopped");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const discardRecording = () => {
    setState("idle");
    setDuration(0);
    setAudioLevel(0);
  };

  const handleFinish = () => {
    router.push("/processing/new");
  };

  const uploadRecording = () => {
    setUploading(true);
    setUploadProgress(0);

    // Simulate upload
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            handleFinish();
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">브라우저 녹음</h1>
          <p className="text-[var(--text-secondary)]">
            마이크를 통해 회의를 직접 녹음하고 바로 처리하세요
          </p>
        </div>

        {/* Recording Card */}
        <div className="p-12 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)] shadow-xl">
          {/* Status Badge */}
          <div className="flex items-center justify-center mb-8">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                state === "recording"
                  ? "bg-[var(--danger-500)]/10 text-[var(--danger-500)]"
                  : state === "paused"
                  ? "bg-[var(--signal-orange-500)]/10 text-[var(--signal-orange-500)]"
                  : state === "stopped"
                  ? "bg-[var(--mint-500)]/10 text-[var(--mint-500)]"
                  : "bg-[var(--graphite-800)] text-[var(--text-secondary)]"
              }`}
            >
              {state === "recording" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-[var(--danger-500)] animate-pulse" />
                  녹음 중
                </>
              )}
              {state === "paused" && (
                <>
                  <Pause className="w-4 h-4" />
                  일시정지
                </>
              )}
              {state === "stopped" && (
                <>
                  <Square className="w-4 h-4" />
                  녹음 완료
                </>
              )}
              {state === "idle" && "녹음 대기"}
            </div>
          </div>

          {/* Duration */}
          <div className="text-center mb-8">
            <div className="text-6xl font-mono font-bold mb-2">{formatDuration(duration)}</div>
            <div className="text-sm text-[var(--text-secondary)]">녹음 시간</div>
          </div>

          {/* Audio Level Meter */}
          {state === "recording" && (
            <div className="mb-8">
              <div className="flex items-center justify-center gap-1 h-24">
                {Array.from({ length: 40 }).map((_, i) => {
                  const barHeight = Math.max(
                    10,
                    Math.sin((i / 40) * Math.PI) * audioLevel + Math.random() * 20
                  );
                  return (
                    <div
                      key={i}
                      className="w-2 rounded-full transition-all duration-100"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor:
                          barHeight > 60
                            ? "var(--danger-500)"
                            : barHeight > 30
                            ? "var(--mint-500)"
                            : "var(--sky-500)",
                        opacity: 0.8,
                      }}
                    />
                  );
                })}
              </div>
              <div className="text-center text-sm text-[var(--text-secondary)] mt-2">실시간 오디오 레벨</div>
            </div>
          )}

          {/* Controls */}
          {!uploading && (
            <div className="flex items-center justify-center gap-4">
              {state === "idle" && (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-all flex items-center justify-center shadow-lg hover:scale-105"
                >
                  <Mic className="w-10 h-10" />
                </button>
              )}

              {state === "recording" && (
                <>
                  <button
                    onClick={pauseRecording}
                    className="w-16 h-16 rounded-full bg-[var(--graphite-800)] border border-[var(--line-strong)] hover:bg-[var(--graphite-700)] transition-all flex items-center justify-center"
                  >
                    <Pause className="w-6 h-6" />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full bg-[var(--danger-500)] text-white hover:opacity-90 transition-all flex items-center justify-center shadow-lg"
                  >
                    <Square className="w-8 h-8" />
                  </button>
                </>
              )}

              {state === "paused" && (
                <>
                  <button
                    onClick={resumeRecording}
                    className="w-16 h-16 rounded-full bg-[var(--mint-500)] text-[var(--graphite-950)] hover:opacity-90 transition-all flex items-center justify-center"
                  >
                    <Play className="w-6 h-6" />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-[var(--danger-500)] text-white hover:opacity-90 transition-all flex items-center justify-center"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                </>
              )}

              {state === "stopped" && (
                <>
                  <button
                    onClick={discardRecording}
                    className="px-6 py-3 rounded-[var(--radius-md)] border border-[var(--line-strong)] hover:bg-[var(--bg-surface-strong)] transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>삭제</span>
                  </button>
                  <button
                    onClick={uploadRecording}
                    className="px-8 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] text-[var(--graphite-950)] hover:opacity-90 transition-opacity flex items-center gap-2 font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    <span>업로드 및 처리</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-4">
              <div className="h-3 bg-[var(--graphite-800)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--mint-500)] to-[var(--sky-500)] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-center text-[var(--text-secondary)]">
                {uploadProgress < 100 ? `업로드 중... ${uploadProgress}%` : "업로드 완료! 처리 페이지로 이동합니다..."}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--line-soft)]">
          <h3 className="font-medium mb-3">녹음 팁</h3>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--mint-500)]" />
              <span>조용한 환경에서 마이크와 가까운 거리에서 녹음하세요</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--mint-500)]" />
              <span>레벨 미터가 빨간색이 되지 않도록 주의하세요 (왜곡 방지)</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--mint-500)]" />
              <span>녹음은 브라우저에서만 저장되며, 업로드 전까지 서버에 전송되지 않습니다</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}