"use client";

import type { MeetingCreateResponse, MeetingSourceType, PromptTemplateId } from "@brevoca/contracts";
import { authedFetch } from "@/lib/client/authed-fetch";
import {
  AUDIO_UPLOAD_CHUNK_BYTES,
  MAX_AUDIO_STORAGE_OBJECT_BYTES,
} from "@/lib/uploads";

interface UploadMeetingAudioInput {
  file: File;
  title: string;
  language: string;
  promptTemplateId: PromptTemplateId;
  sourceType: MeetingSourceType;
  tags?: string[];
  durationSec?: number | null;
  onProgress?: (progress: number) => void;
}

export async function uploadMeetingAudio(
  input: UploadMeetingAudioInput,
): Promise<MeetingCreateResponse> {
  if (input.file.size <= MAX_AUDIO_STORAGE_OBJECT_BYTES) {
    return uploadSingleFile(input);
  }

  return uploadChunkedFile(input);
}

async function uploadSingleFile(
  input: UploadMeetingAudioInput,
): Promise<MeetingCreateResponse> {
  input.onProgress?.(10);
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("title", input.title);
  formData.append("language", input.language);
  formData.append("promptTemplateId", input.promptTemplateId);
  formData.append("sourceType", input.sourceType);
  formData.append("tags", JSON.stringify(input.tags ?? []));
  if (input.durationSec) {
    formData.append("durationSec", String(input.durationSec));
  }

  const response = await authedFetch("/api/meetings", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  input.onProgress?.(100);
  return (await response.json()) as MeetingCreateResponse;
}

async function uploadChunkedFile(
  input: UploadMeetingAudioInput,
): Promise<MeetingCreateResponse> {
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.ceil(input.file.size / AUDIO_UPLOAD_CHUNK_BYTES);
  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * AUDIO_UPLOAD_CHUNK_BYTES;
    const end = Math.min(start + AUDIO_UPLOAD_CHUNK_BYTES, input.file.size);
    const chunk = input.file.slice(start, end);
    const formData = new FormData();
    formData.append("chunk", chunk, `${input.file.name}.part`);
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", String(chunkIndex));

    const response = await authedFetch("/api/meeting-uploads/chunks", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await getResponseError(response));
    }

    uploadedBytes += chunk.size;
    input.onProgress?.(
      Math.min(90, Math.round((uploadedBytes / input.file.size) * 90)),
    );
  }

  const finalizeResponse = await authedFetch("/api/meeting-uploads/complete", {
    method: "POST",
    body: JSON.stringify({
      uploadId,
      totalChunks,
      fileName: input.file.name,
      title: input.title,
      language: input.language,
      promptTemplateId: input.promptTemplateId,
      sourceType: input.sourceType,
      tags: input.tags ?? [],
      durationSec: input.durationSec ?? null,
    }),
  });

  if (!finalizeResponse.ok) {
    throw new Error(await getResponseError(finalizeResponse));
  }

  input.onProgress?.(100);
  return (await finalizeResponse.json()) as MeetingCreateResponse;
}

async function getResponseError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || response.statusText;
  } catch {
    return response.statusText;
  }
}
