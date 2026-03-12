from fastapi import APIRouter

from app.schemas.job import JobStatusResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str) -> JobStatusResponse:
    return JobStatusResponse(
        id=job_id,
        meeting_id="pending-link",
        job_type="transcribe",
        status="queued",
        progress=0,
    )
