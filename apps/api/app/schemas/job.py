from typing import Literal

from pydantic import BaseModel


JobType = Literal["transcribe", "summarize", "export"]
JobStatus = Literal["queued", "processing", "completed", "failed"]


class JobStatusResponse(BaseModel):
    id: str
    meeting_id: str
    job_type: JobType
    status: JobStatus
    progress: int
