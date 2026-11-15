from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app
from app.services.bill_history import Word, read_table


def test_history_reads_units_and_keeps_the_latest_twelve_months():
    headings = [Word("MONTH", 380, 145, 6), Word("UNITS", 428, 145, 6), Word("BILL", 478, 145, 6)]
    months = "Jul23 Aug23 Sep23 Oct23 Nov23 Dec23 Jan24 Feb24 Mar24 Apr24 May24 Jun24 Jul24".split()
    rows = [
        Word(text, x, 162 + index * 13, 7)
        for index, month in enumerate(months)
        for text, x in [(month, 380), (f"{1_000 + index:,}", 428), ("4900", 478)]
    ]
    readings = read_table(headings + rows)
    assert list(readings) == [
        "2023-08", "2023-09", "2023-10", "2023-11", "2023-12", "2024-01",
        "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07",
    ]
    assert readings["2023-08"] == 1001
    assert readings["2024-07"] == 1012


def test_history_leaves_missing_units_blank_and_preserves_zero():
    words = [
        Word("MONTH", 20, 10, 8), Word("UNITS", 60, 10, 8), Word("BILL", 90, 10, 8),
        Word("Dec 23", 20, 24, 8), Word("500", 90, 24, 8),
        Word("Jan", 10, 38, 8), Word("-", 20, 38, 8), Word("24", 25, 38, 8),
        Word("RP", 51, 38, 8), Word("0", 64, 38, 8), Word("600", 90, 38, 8),
    ]
    assert read_table(words) == {"2024-01": 0}


def test_bill_upload_requires_auth_and_rejects_invalid_documents(monkeypatch):
    client = TestClient(app)
    path = "/api/v1/solar-sizing/bill-history"
    files = {"bill": ("not-a-bill.pdf", b"invalid", "application/pdf")}
    assert client.post(path, files=files).status_code == 401
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: object())
    assert client.post(path, files=files).status_code == 422
