"use client";

import type { MeetingCreateResponse, MeetingSourceType, PromptTemplateId } from "@brevoca/contracts";
import { authedFetch } from "@/lib/client/authed-fetch";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
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
    return uploadSingleFileDirect(input);
  }

  return uploadChunkedFileDirect(input);
}

async function uploadSingleFileDirect(
  input: UploadMeetingAudioInput,
): Promise<MeetingCreateResponse> {
  const uploadId = crypto.randomUUID();
  input.onProgress?.(10);

  const signedUpload = await createSignedUpload({
    uploadId,
    fileName: input.file.name,
  });

  await uploadFileToStorage(
    signedUpload.bucket,
    signedUpload.path,
    signedUpload.token,
    input.file,
    input.file.type || undefined,
  );

  input.onProgress?.(85);

  return finalizeUpload({
    uploadId,
    totalChunks: 1,
    fileName: input.file.name,
    title: input.title,
    language: input.language,
    promptTemplateId: input.promptTemplateId,
    sourceType: input.sourceType,
    tags: input.tags ?? [],
    durationSec: input.durationSec ?? null,
    onProgress: input.onProgress,
  });
}

async function uploadChunkedFileDirect(
  input: UploadMeetingAudioInput,
): Promise<MeetingCreateResponse> {
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.ceil(input.file.size / AUDIO_UPLOAD_CHUNK_BYTES);
  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * AUDIO_UPLOAD_CHUNK_BYTES;
    const end = Math.min(start + AUDIO_UPLOAD_CHUNK_BYTES, input.file.size);
    const chunk = input.file.slice(start, end);

    const signedUpload = await createSignedUpload({
      uploadId,
      fileName: input.file.name,
      chunkIndex,
    });

    await uploadFileToStorage(
      signedUpload.bucket,
      signedUpload.path,
      signedUpload.token,
      chunk,
      "application/octet-stream",
    );

    uploadedBytes += chunk.size;
    input.onProgress?.(
      Math.min(90, Math.round((uploadedBytes / input.file.size) * 90)),
    );
  }

  return finalizeUpload({
    uploadId,
    totalChunks,
    fileName: input.file.name,
    title: input.title,
    language: input.language,
    promptTemplateId: input.promptTemplateId,
    sourceType: input.sourceType,
    tags: input.tags ?? [],
    durationSec: input.durationSec ?? null,
    onProgress: input.onProgress,
  });
}

interface SignedUploadPayload {
  bucket: string;
  path: string;
  token: string;
}

async function createSignedUpload(input: {
  uploadId: string;
  fileName: string;
  chunkIndex?: number;
}): Promise<SignedUploadPayload> {
  const response = await authedFetch("/api/meeting-uploads/signed-url", {
    method: "POST",
    body: JSON.stringify({
      uploadId: input.uploadId,
      fileName: input.fileName,
      chunkIndex: input.chunkIndex ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  return (await response.json()) as SignedUploadPayload;
}

async function uploadFileToStorage(
  bucket: string,
  path: string,
  token: string,
  fileBody: Blob,
  contentType?: string,
) {
  const supabase = getBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, fileBody, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

async function finalizeUpload(input: {
  uploadId: string;
  totalChunks: number;
  fileName: string;
  title: string;
  language: string;
  promptTemplateId: PromptTemplateId;
  sourceType: MeetingSourceType;
  tags: string[];
  durationSec: number | null;
  onProgress?: (progress: number) => void;
}): Promise<MeetingCreateResponse> {
  const finalizeResponse = await authedFetch("/api/meeting-uploads/complete", {
    method: "POST",
    body: JSON.stringify({
      uploadId: input.uploadId,
      totalChunks: input.totalChunks,
      fileName: input.fileName,
      title: input.title,
      language: input.language,
      promptTemplateId: input.promptTemplateId,
      sourceType: input.sourceType,
      tags: input.tags,
      durationSec: input.durationSec,
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
