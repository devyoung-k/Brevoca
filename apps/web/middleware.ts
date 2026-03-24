import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  MAX_AUDIO_UPLOAD_REQUEST_BYTES,
  getAudioUploadTooLargeMessage,
} from "@/lib/uploads";

export function middleware(request: NextRequest) {
  // POST /api/meetings 에 대해서만 Content-Length 선제 검사
  if (request.method === "POST" && request.nextUrl.pathname === "/api/meetings") {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_AUDIO_UPLOAD_REQUEST_BYTES) {
      return NextResponse.json(
        { error: getAudioUploadTooLargeMessage() },
        { status: 413 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
