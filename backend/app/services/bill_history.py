import re
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO

import pdfplumber
from pdfminer.pdfexceptions import PDFException
from PIL import Image, ImageOps
from pypdfium2 import PdfiumError

MAX_BILL_BYTES = 8 * 1024 * 1024
MAX_PAGES = 3
MAX_IMAGE_PIXELS = 24_000_000
MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split()
MONTH_PATTERN = re.compile(r"([a-z]{3,9})[\s./'\-–]*(20\d{2}|\d{2})", re.IGNORECASE)
UNIT_PATTERN = re.compile(r"(?:\d{1,7}|\d{1,3}(?:,\d{3}){1,2})(?:\.\d{1,2})?")


class InvalidBill(ValueError):
    pass


@dataclass(frozen=True)
class Word:
    text: str
    x: float
    y: float
    height: float


def parse_month(text: str) -> str | None:
    match = MONTH_PATTERN.fullmatch(text.strip())
    if not match or match[1][:3].lower() not in MONTHS:
        return None
    month = MONTHS.index(match[1][:3].lower()) + 1
    return f"20{match[2][-2:]}-{month:02d}"


def parse_units(text: str) -> float | None:
    cleaned = re.sub(r"^RP\s+", "", text.strip(), flags=re.IGNORECASE)
    if not UNIT_PATTERN.fullmatch(cleaned):
        return None
    value = float(cleaned.replace(",", ""))
    return value if value < 10_000_000 else None


def latest_year(readings: dict[str, float]) -> dict[str, float]:
    if not readings:
        return {}
    latest_year, latest_month = map(int, max(readings).split("-"))
    earliest_year, earliest_month = divmod(latest_year * 12 + latest_month - 12, 12)
    earliest = f"{earliest_year:04d}-{earliest_month + 1:02d}"
    return {month: readings[month] for month in sorted(readings) if month >= earliest}


def read_table(words: list[Word]) -> dict[str, float]:
    """Read the PITC history table using its column headings as anchors."""
    best = {}
    for month_label in words:
        if month_label.text.casefold() != "month":
            continue
        header = sorted(
            (word for word in words if word.x > month_label.x
             and abs(word.y - month_label.y) <= month_label.height),
            key=lambda word: word.x,
        )
        units_label = next((word for word in header if word.text.casefold() == "units"), None)
        if units_label is None:
            continue
        bill_label = next((word for word in header if word.x > units_label.x and word.text.casefold() == "bill"), None)
        if bill_label is None:
            continue
        # Exclude other fields on the same page and the adjacent bill/payment columns.
        month_right = (month_label.x + units_label.x) / 2
        month_left = 2 * month_label.x - month_right
        units_right = (units_label.x + bill_label.x) / 2
        table = [word for word in words if month_left <= word.x < units_right and
                 month_label.y + month_label.height < word.y < month_label.y + 34 * month_label.height]
        month_words = [word for word in table if word.x < month_right]
        unit_words = [word for word in table if word.x >= month_right]
        readings = {}
        conflicts = set()
        for word in month_words:
            month = parse_month(word.text)
            if month is None:
                # PDF or OCR can split the month name, dash, and year into separate tokens.
                row = sorted(
                    (item for item in month_words if abs(item.y - word.y) <= word.height * 0.65),
                    key=lambda item: item.x,
                )
                if row[0] != word:
                    continue
                month = parse_month(" ".join(item.text for item in row))
            if month is None:
                continue
            candidates = [
                parse_units(item.text) for item in unit_words
                if abs(item.y - word.y) <= max(item.height, word.height) * 0.7
                and item.text.casefold() != "rp"
            ]
            if len(candidates) != 1 or candidates[0] is None:
                continue
            if month in readings and readings[month] != candidates[0]:
                conflicts.add(month)
            readings[month] = candidates[0]
        readings = latest_year({month: value for month, value in readings.items() if month not in conflicts})
        if len(readings) > len(best):
            best = readings
    return best


@lru_cache(maxsize=1)
def ocr_engine():
    from rapidocr import RapidOCR

    return RapidOCR(params={
        "EngineConfig.onnxruntime.intra_op_num_threads": 2,
        "EngineConfig.onnxruntime.inter_op_num_threads": 1,
        "Global.max_side_len": 2400,
    })


def ocr_words(image: Image.Image) -> list[Word]:
    result = ocr_engine()(image, use_cls=False)
    if result.boxes is None:
        return []
    words = []
    for points, text, confidence in zip(result.boxes, result.txts, result.scores):
        if confidence < 0.70:
            continue
        left, top = points.min(axis=0)
        right, bottom = points.max(axis=0)
        # Keep merged cells intact. Ambiguous values are left blank for review.
        words.append(Word(text.strip(), (left + right) / 2, (top + bottom) / 2, bottom - top))
    return words


def read_bill(data: bytes) -> dict[str, float]:
    try:
        if data.startswith(b"%PDF-"):
            with pdfplumber.open(BytesIO(data)) as document:
                if len(document.pages) > MAX_PAGES:
                    raise InvalidBill("Choose an electricity bill with at most three pages.")
                best = {}
                for page in document.pages:
                    readings = read_table([
                        Word(word["text"], (word["x0"] + word["x1"]) / 2,
                             (word["top"] + word["bottom"]) / 2, word["bottom"] - word["top"])
                        for word in page.extract_words()
                    ])
                    if len(readings) > len(best):
                        best = readings
                    if len(best) == 12:
                        return best
                for page in document.pages:
                    resolution = min(220, 2600 * 72 / max(page.width, page.height))
                    readings = read_table(ocr_words(page.to_image(resolution=resolution).original))
                    if len(readings) > len(best):
                        best = readings
                    if len(best) == 12:
                        break
                return best

        with Image.open(BytesIO(data), formats=["JPEG", "PNG"]) as source:
            if source.width * source.height > MAX_IMAGE_PIXELS:
                raise InvalidBill("The bill image is too large. Crop it to the usage table or choose a smaller image.")
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2600, 2600))
            return read_table(ocr_words(image))
    except InvalidBill:
        raise
    except (Image.DecompressionBombError, OSError, PdfiumError, PDFException, ValueError, ZeroDivisionError):
        raise InvalidBill("This bill could not be opened. Choose a readable PDF, JPG, or PNG.") from None
