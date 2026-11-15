from anyio import CapacityLimiter, to_thread
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from ....models.user import User
from ....services.bill_history import InvalidBill, MAX_BILL_BYTES, read_bill
from ...deps import get_current_user

router = APIRouter()
bill_workers = CapacityLimiter(1)


class MonthlyReading(BaseModel):
    month: str
    units_kwh: float


class BillHistory(BaseModel):
    readings: list[MonthlyReading]


@router.post("/bill-history", response_model=BillHistory)
async def bill_history(bill: UploadFile, _user: User = Depends(get_current_user)) -> BillHistory:
    data = await bill.read(MAX_BILL_BYTES + 1)
    if len(data) > MAX_BILL_BYTES:
        raise HTTPException(413, "Choose a bill under 8 MB.")
    try:
        readings = await to_thread.run_sync(read_bill, data, limiter=bill_workers)
    except InvalidBill as error:
        raise HTTPException(422, str(error)) from None
    return BillHistory(readings=[
        MonthlyReading(month=month, units_kwh=units) for month, units in readings.items()
    ])
