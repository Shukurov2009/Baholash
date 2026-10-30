"""Hamma kirgan foydalanuvchilar uchun umumiy baholash qoidalari (frontend shundan foydalanadi)."""
from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import User
from ..services.evaluation_service import LOW_SCORE, MAX_SCORE, MIN_COMMENT_LEN, now_period

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("/rules")
def rules(_: User = Depends(get_current_user)):
    year, month = now_period()
    return {"year": year, "month": month, "max_score": MAX_SCORE,
            "low_score_threshold": LOW_SCORE, "min_comment_length": MIN_COMMENT_LEN}
