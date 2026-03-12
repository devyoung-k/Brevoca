from fastapi import APIRouter

from app.schemas.meeting import MeetingListResponse

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=MeetingListResponse)
async def list_meetings() -> MeetingListResponse:
    return MeetingListResponse(items=[], next_cursor=None)
