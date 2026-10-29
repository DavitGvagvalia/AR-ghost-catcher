#!/usr/bin/env python3
"""Generate the printable AR marker pack from the versioned marker manifest assets."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[2]
MARKER_DIR = ROOT / "apps" / "web" / "public" / "markers" / "printable"
OUTPUT_PATH = ROOT / "output" / "pdf" / "ghost-hunt-marker-pack.pdf"
PAGE_WIDTH, PAGE_HEIGHT = A4
INK = colors.HexColor("#17131f")
ORANGE = colors.HexColor("#f36d21")
MUTED = colors.HexColor("#615b68")
RULE = colors.HexColor("#c9c5ce")


def marker_path(number: int) -> Path:
    path = MARKER_DIR / f"ar_marker-{number}.jpg"
    if not path.is_file():
        raise FileNotFoundError(f"Missing marker artwork: {path}")
    return path


def marker_id(number: int) -> str:
    return f"marker-{number:02d}"


def draw_header(pdf: Canvas, title: str, subtitle: str) -> None:
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(16 * mm, PAGE_HEIGHT - 18 * mm, title)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(16 * mm, PAGE_HEIGHT - 24 * mm, subtitle)
    pdf.setStrokeColor(ORANGE)
    pdf.setLineWidth(1.5)
    pdf.line(16 * mm, PAGE_HEIGHT - 29 * mm, 194 * mm, PAGE_HEIGHT - 29 * mm)


def draw_footer(pdf: Canvas, page_number: int, label: str) -> None:
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawString(16 * mm, 9 * mm, label)
    page_text = f"Page {page_number}"
    pdf.drawRightString(194 * mm, 9 * mm, page_text)


def draw_marker_card(
    pdf: Canvas,
    number: int,
    x: float,
    y: float,
    size: float,
    show_cut_line: bool,
) -> None:
    padding = 6 * mm
    label_height = 13 * mm
    card_x = x - padding
    card_y = y - label_height
    card_width = size + 2 * padding
    card_height = size + label_height + padding

    if show_cut_line:
        pdf.setStrokeColor(RULE)
        pdf.setLineWidth(0.45)
        pdf.setDash(2, 2)
        pdf.rect(card_x, card_y, card_width, card_height, stroke=1, fill=0)
        pdf.setDash()

    pdf.drawImage(
        str(marker_path(number)),
        x,
        y,
        width=size,
        height=size,
        preserveAspectRatio=True,
        anchor="c",
    )
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawCentredString(x + size / 2, y - 6 * mm, marker_id(number))
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawCentredString(x + size / 2, y - 10 * mm, "Keep the full black border unobstructed")


def contact_sheet(pdf: Canvas, page_number: int) -> None:
    draw_header(
        pdf,
        "Ghost Hunt marker index",
        "Visual index only. Use the placement pages for event-size prints.",
    )
    columns = 5
    rows = 6
    image_size = 29 * mm
    cell_width = 35.5 * mm
    cell_height = 39 * mm
    start_x = 17 * mm
    start_y = PAGE_HEIGHT - 68 * mm

    for index in range(30):
        row = index // columns
        column = index % columns
        x = start_x + column * cell_width + (cell_width - image_size) / 2
        y = start_y - row * cell_height
        number = index + 1
        pdf.drawImage(
            str(marker_path(number)),
            x,
            y,
            width=image_size,
            height=image_size,
            preserveAspectRatio=True,
            anchor="c",
        )
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica-Bold", 7)
        pdf.drawCentredString(x + image_size / 2, y - 4.2 * mm, marker_id(number))

    draw_footer(pdf, page_number, "Index - 30 unique pattern markers")
    pdf.showPage()


def placement_pages(pdf: Canvas, first_page_number: int) -> int:
    marker_size = 90 * mm
    x = (PAGE_WIDTH - marker_size) / 2
    y_positions = [PAGE_HEIGHT - 126 * mm, 29 * mm]
    page_number = first_page_number

    for first_number in range(1, 31, 2):
        draw_header(
            pdf,
            f"Placement sheet {marker_id(first_number)} / {marker_id(first_number + 1)}",
            "Print at Actual size (100%). Each marker artwork is 90 mm square.",
        )
        draw_marker_card(pdf, first_number, x, y_positions[0], marker_size, True)
        draw_marker_card(pdf, first_number + 1, x, y_positions[1], marker_size, True)
        draw_footer(pdf, page_number, "Cut only on the gray guide outside the labeled card")
        pdf.showPage()
        page_number += 1

    return page_number


def draw_measurement_bar(pdf: Canvas, x: float, y: float) -> None:
    length = 100 * mm
    pdf.setStrokeColor(INK)
    pdf.setLineWidth(1)
    pdf.line(x, y, x + length, y)
    for tick in range(11):
        tick_x = x + tick * 10 * mm
        tick_height = 5 * mm if tick in (0, 10) else 3 * mm
        pdf.line(tick_x, y - tick_height / 2, tick_x, y + tick_height / 2)
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica", 7)
        pdf.drawCentredString(tick_x, y - 7 * mm, str(tick * 10))
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawCentredString(x + length / 2, y + 5 * mm, "100 mm print calibration bar")


def wrapped_lines(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and stringWidth(candidate, font, size) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_note(pdf: Canvas, number: int, text: str, x: float, y: float, width: float) -> float:
    badge = 7 * mm
    pdf.setFillColor(ORANGE)
    pdf.circle(x + badge / 2, y - badge / 2, badge / 2, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawCentredString(x + badge / 2, y - badge / 2 - 2.5, str(number))
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 9)
    lines = wrapped_lines(text, "Helvetica", 9, width - 11 * mm)
    line_y = y - 3.5 * mm
    for line in lines:
        pdf.drawString(x + 11 * mm, line_y, line)
        line_y -= 4.5 * mm
    return min(line_y, y - badge - 3 * mm)


def calibration_page(pdf: Canvas, page_number: int) -> None:
    draw_header(
        pdf,
        "Print and camera calibration",
        "Complete this page before printing the full event pack.",
    )
    draw_measurement_bar(pdf, 25 * mm, PAGE_HEIGHT - 50 * mm)

    notes = [
        "Print this page at Actual size or 100%. Disable Fit, Shrink, and Scale to page.",
        "Measure the bar with a physical ruler. It must be 100 mm before marker testing continues.",
        "Keep the marker flat, evenly lit, and fully visible. Do not cover or trim its black border.",
        "Record recognition results on the actual iPhone and Android devices that will be used at the event.",
    ]
    y = PAGE_HEIGHT - 72 * mm
    for index, note in enumerate(notes, start=1):
        y = draw_note(pdf, index, note, 20 * mm, y, 170 * mm) - 3 * mm

    marker_size = 90 * mm
    marker_x = (PAGE_WIDTH - marker_size) / 2
    marker_y = 28 * mm
    draw_marker_card(pdf, 1, marker_x, marker_y, marker_size, False)

    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(
        PAGE_WIDTH / 2,
        marker_y + marker_size + 8 * mm,
        "Test marker - same 90 mm artwork size as every placement page",
    )
    draw_footer(pdf, page_number, "Calibration - do not infer event readiness from the PDF alone")
    pdf.showPage()


def closest_pair_page(pdf: Canvas, page_number: int) -> None:
    draw_header(
        pdf,
        "Closest-pair recognition check",
        "The automated comparison found marker-16 and marker-18 closest; this is not a camera pass/fail result.",
    )
    marker_size = 72 * mm
    gap = 18 * mm
    total_width = marker_size * 2 + gap
    start_x = (PAGE_WIDTH - total_width) / 2
    y = PAGE_HEIGHT - 125 * mm
    draw_marker_card(pdf, 16, start_x, y, marker_size, False)
    draw_marker_card(pdf, 18, start_x + marker_size + gap, y, marker_size, False)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(22 * mm, 116 * mm, "Record real-device observations")
    fields = [
        "Device and browser:",
        "Lighting and print material:",
        "Near / typical / far recognition:",
        "Tilt and rotation behavior:",
        "Both markers visible at once:",
        "Unexpected cross-identification:",
    ]
    field_y = 105 * mm
    for label in fields:
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica", 8.5)
        pdf.drawString(22 * mm, field_y, label)
        pdf.setStrokeColor(RULE)
        pdf.setLineWidth(0.5)
        pdf.line(72 * mm, field_y - 1 * mm, 188 * mm, field_y - 1 * mm)
        field_y -= 13 * mm

    draw_footer(pdf, page_number, "Recognition results belong in docs/marker-printing.md")
    pdf.showPage()


def main() -> None:
    for number in range(1, 31):
        marker_path(number)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pdf = Canvas(str(OUTPUT_PATH), pagesize=A4, pageCompression=1)
    pdf.setTitle("Halloween AR Ghost Hunt - Printable Marker Pack")
    pdf.setAuthor("Halloween AR Ghost Hunt project")
    pdf.setSubject("30 labeled AR.js pattern markers with print calibration pages")

    page_number = 1
    contact_sheet(pdf, page_number)
    page_number += 1
    page_number = placement_pages(pdf, page_number)
    calibration_page(pdf, page_number)
    page_number += 1
    closest_pair_page(pdf, page_number)
    pdf.save()
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
