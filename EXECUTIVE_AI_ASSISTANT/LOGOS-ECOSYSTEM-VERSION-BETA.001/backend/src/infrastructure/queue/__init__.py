from celery import Celery
from kombu import Exchange, Queue
from typing import Any, Dict

from ...shared.utils.config import get_settings
from ...shared.utils.logger import setup_logger

logger = setup_logger(__name__)
settings = get_settings()

# Create Celery app
celery_app = Celery(
    "logos_ecosystem",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.services.tasks.email",
        "src.services.tasks.ai",
        "src.services.tasks.marketplace",
        "src.services.tasks.analytics"
    ]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

# Define queues
celery_app.conf.task_routes = {
    "src.services.tasks.email.*": {"queue": "email"},
    "src.services.tasks.ai.*": {"queue": "ai"},
    "src.services.tasks.marketplace.*": {"queue": "marketplace"},
    "src.services.tasks.analytics.*": {"queue": "analytics"},
}

# Queue configuration
celery_app.conf.task_queues = (
    Queue("default", Exchange("default"), routing_key="default"),
    Queue("email", Exchange("email"), routing_key="email"),
    Queue("ai", Exchange("ai"), routing_key="ai"),
    Queue("marketplace", Exchange("marketplace"), routing_key="marketplace"),
    Queue("analytics", Exchange("analytics"), routing_key="analytics"),
)

# Task retry configuration
celery_app.conf.task_annotations = {
    "*": {
        "rate_limit": "10/s",
        "retry_kwargs": {"max_retries": 3},
        "retry_backoff": True,
        "retry_backoff_max": 600,
        "retry_jitter": True,
    }
}


def get_celery_app() -> Celery:
    """Get Celery app instance."""
    return celery_app