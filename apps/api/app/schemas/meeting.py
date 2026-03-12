from pydantic import BaseModel


class MeetingListItem(BaseModel):
    id: str
    title: str
    status: str
    source_type: str
    language: str


class MeetingListResponse(BaseModel):
    items: list[MeetingListItem]
    next_cursor: str | None
