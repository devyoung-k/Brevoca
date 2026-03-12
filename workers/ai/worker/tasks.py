from celery.utils.log import get_task_logger

from worker.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(name="meetings.transcribe")
def transcribe_meeting(meeting_id: str) -> dict[str, str]:
    logger.info("Queued transcription task for meeting=%s", meeting_id)
    return {
        "meeting_id": meeting_id,
        "stage": "transcribe",
        "status": "placeholder",
    }


@celery_app.task(name="meetings.summarize")
def summarize_meeting(meeting_id: str) -> dict[str, str]:
    logger.info("Queued summary task for meeting=%s", meeting_id)
    return {
        "meeting_id": meeting_id,
        "stage": "summarize",
        "status": "placeholder",
    }
