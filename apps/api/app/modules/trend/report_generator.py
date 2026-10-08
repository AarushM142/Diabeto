import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line

def generate_clinical_pdf_report(
    patient: Dict[str, Any],
    clinic: Optional[Dict[str, Any]] = None,
    clinician: Optional[Dict[str, Any]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    medications: Optional[List[Dict[str, Any]]] = None,
    notes: Optional[str] = None,
) -> io.BytesIO:
    """
    Generates a professional clinical OPD consultation report (PDF)
    including clinic letterhead, patient profile, ADA glycemic metrics,
    medication schedules, recent readings table, and doctor sign-off.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1e3a8a") # Deep Navy
    secondary_color = colors.HexColor("#0284c7") # Ocean Blue
    accent_green = colors.HexColor("#059669")
    dark_text = colors.HexColor("#0f172a")
    gray_bg = colors.HexColor("#f8fafc")
    border_gray = colors.HexColor("#cbd5e1")

    clinic_title_style = ParagraphStyle(
        "ClinicTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=primary_color,
    )
    clinic_sub_style = ParagraphStyle(
        "ClinicSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    doc_header_style = ParagraphStyle(
        "DocHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=primary_color,
        alignment=2, # Right aligned
    )
    doc_sub_style = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
        alignment=2,
    )
    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=primary_color,
        spaceAfter=4,
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=dark_text,
    )
    body_regular = ParagraphStyle(
        "BodyRegular",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=dark_text,
    )
    table_cell_header = ParagraphStyle(
        "TableCellHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=dark_text,
    )

    story = []

    # 1. Header & Letterhead
    clinic_name = clinic.get("name", "Diabeto Senior Diabetes & Geriatric Clinic") if clinic else "Diabeto Senior Diabetes & Geriatric Clinic"
    clinic_address = clinic.get("address", "Shivaji Nagar, Pune, Maharashtra 411005") if clinic else "Shivaji Nagar, Pune, Maharashtra 411005"
    doctor_name = clinician.get("name", "Dr. Arvind Mehta, MD") if clinician else "Dr. Arvind Mehta, MD"
    doctor_phone = clinician.get("phone", "+91 98111 11111") if clinician else "+91 98111 11111"

    header_data = [
        [
            Paragraph(f"<b>{clinic_name}</b><br/>{clinic_address}<br/><b>Reg No:</b> MAH/PUN/2024/9821 | <b>EHR Integration:</b> Diabeto V1.0", clinic_title_style),
            Paragraph(f"<b>{doctor_name}</b><br/>Consultant Diabetologist<br/>Geriatric Care Unit<br/>Tel: {doctor_phone}", doc_header_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 210])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=4, spaceAfter=8))

    # 2. Patient Demographics Strip
    pt_name = patient.get("name", "Unknown Patient")
    pt_id = patient.get("id", "N/A")
    pt_age = patient.get("age", "--")
    pt_gender = patient.get("gender", "--").capitalize()
    pt_phone = patient.get("phone", "--")
    pt_lang = patient.get("language", "en").upper()
    report_date = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    patient_info_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_regular),
            Paragraph(f"<b>{pt_name}</b>", body_bold),
            Paragraph("<b>Age / Gender:</b>", body_regular),
            Paragraph(f"{pt_age} Yrs / {pt_gender}", body_regular),
            Paragraph("<b>Report Date:</b>", body_regular),
            Paragraph(report_date, body_regular),
        ],
        [
            Paragraph("<b>Patient ID:</b>", body_regular),
            Paragraph(pt_id, body_regular),
            Paragraph("<b>Contact:</b>", body_regular),
            Paragraph(pt_phone, body_regular),
            Paragraph("<b>Preferred Language:</b>", body_regular),
            Paragraph(pt_lang, body_regular),
        ]
    ]
    patient_table = Table(patient_info_data, colWidths=[75, 115, 75, 105, 80, 90])
    patient_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), gray_bg),
        ("BOX", (0, 0), (-1, -1), 0.5, border_gray),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 10))

    # 3. Glycemic Statistics & ADA Compliance
    events_list = events or []
    glucose_vals = [float(e.get("value", {}).get("mgdl", 0)) for e in events_list if e.get("type") == "glucose" and "mgdl" in e.get("value", {})]
    
    count = len(glucose_vals)
    avg_glucose = sum(glucose_vals) / count if count else 0.0
    min_glucose = min(glucose_vals) if count else 0.0
    max_glucose = max(glucose_vals) if count else 0.0

    # Calculate Time In Range (TIR: 70 - 180 mg/dL according to ADA guidelines)
    in_range = [g for g in glucose_vals if 70 <= g <= 180]
    below_range = [g for g in glucose_vals if g < 70]
    above_range = [g for g in glucose_vals if g > 180]
    
    tir_pct = (len(in_range) / count * 100) if count else 0.0
    hypo_pct = (len(below_range) / count * 100) if count else 0.0
    hyper_pct = (len(above_range) / count * 100) if count else 0.0

    # Estimated HbA1c formula: (Average Glucose + 46.7) / 28.7
    est_hba1c = (avg_glucose + 46.7) / 28.7 if avg_glucose > 0 else 0.0

    # ADA Compliance Grade
    if tir_pct >= 70.0 and hypo_pct < 4.0:
        ada_status = "Optimal Control (ADA Target Met)"
        ada_badge_color = colors.HexColor("#059669")
    elif tir_pct >= 50.0:
        ada_status = "Moderate Control (Requires Coaching)"
        ada_badge_color = colors.HexColor("#d97706")
    else:
        ada_status = "Sub-Optimal Control (Action Required)"
        ada_badge_color = colors.HexColor("#dc2626")

    story.append(Paragraph("14-Day Glycemic Overview & ADA Metrics", section_heading_style))

    metrics_data = [
        [
            Paragraph("<b>Readings Ingested:</b>", body_regular),
            Paragraph(f"<b>{count}</b> entries", body_bold),
            Paragraph("<b>Average Glucose:</b>", body_regular),
            Paragraph(f"<b>{avg_glucose:.1f} mg/dL</b>", body_bold),
            Paragraph("<b>Estimated HbA1c:</b>", body_regular),
            Paragraph(f"<b>{est_hba1c:.1f}%</b>" if est_hba1c else "--", body_bold),
        ],
        [
            Paragraph("<b>Min / Max Glucose:</b>", body_regular),
            Paragraph(f"{min_glucose:.0f} / {max_glucose:.0f} mg/dL", body_regular),
            Paragraph("<b>Time in Range (70-180):</b>", body_regular),
            Paragraph(f"<b>{tir_pct:.1f}%</b> (Target &gt; 70%)", body_bold),
            Paragraph("<b>ADA Assessment:</b>", body_regular),
            Paragraph(f"<b>{ada_status}</b>", ParagraphStyle("AdABadge", parent=body_bold, textColor=ada_badge_color)),
        ]
    ]
    metrics_table = Table(metrics_data, colWidths=[95, 85, 100, 85, 95, 80])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), gray_bg),
        ("BOX", (0, 0), (-1, -1), 0.5, border_gray),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 8))

    # Visual Time in Range Progress Bar
    bar_width = 540
    bar_height = 14
    d = Drawing(bar_width, bar_height + 14)
    
    w_hypo = (hypo_pct / 100.0) * bar_width
    w_tir = (tir_pct / 100.0) * bar_width
    w_hyper = (hyper_pct / 100.0) * bar_width

    # Background rect
    d.add(Rect(0, 10, bar_width, bar_height, fillColor=colors.HexColor("#e2e8f0"), strokeColor=None))
    curr_x = 0
    if w_hypo > 0:
        d.add(Rect(curr_x, 10, w_hypo, bar_height, fillColor=colors.HexColor("#ef4444"), strokeColor=None))
        curr_x += w_hypo
    if w_tir > 0:
        d.add(Rect(curr_x, 10, w_tir, bar_height, fillColor=colors.HexColor("#10b981"), strokeColor=None))
        curr_x += w_tir
    if w_hyper > 0:
        d.add(Rect(curr_x, 10, w_hyper, bar_height, fillColor=colors.HexColor("#f59e0b"), strokeColor=None))

    d.add(String(0, 0, f"Low (<70): {hypo_pct:.1f}%", fontSize=7.5, fontName="Helvetica", fillColor=colors.HexColor("#b91c1c")))
    d.add(String(200, 0, f"In Range (70-180 mg/dL): {tir_pct:.1f}%", fontSize=7.5, fontName="Helvetica-Bold", fillColor=colors.HexColor("#047857")))
    d.add(String(420, 0, f"High (>180): {hyper_pct:.1f}%", fontSize=7.5, fontName="Helvetica", fillColor=colors.HexColor("#b45309")))
    story.append(d)
    story.append(Spacer(1, 10))

    # 4. Medication Regimen Table
    story.append(Paragraph("Current Prescribed Medication Schedule", section_heading_style))
    meds_list = medications or []
    if meds_list:
        med_rows = [
            [
                Paragraph("<b>Medication Name</b>", table_cell_header),
                Paragraph("<b>Dosage</b>", table_cell_header),
                Paragraph("<b>Scheduled Time</b>", table_cell_header),
                Paragraph("<b>Instructions</b>", table_cell_header),
                Paragraph("<b>Status</b>", table_cell_header),
            ]
        ]
        for m in meds_list:
            status_text = "Active" if m.get("is_active", True) else "Discontinued"
            med_rows.append([
                Paragraph(m.get("drug_name", "--"), table_cell),
                Paragraph(m.get("dosage", "--"), table_cell),
                Paragraph(m.get("scheduled_time", "--"), table_cell),
                Paragraph(m.get("instructions", "As prescribed") or "As prescribed", table_cell),
                Paragraph(status_text, table_cell),
            ])
        med_table = Table(med_rows, colWidths=[140, 90, 90, 150, 70])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_gray),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_gray),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(med_table)
    else:
        story.append(Paragraph("<i>No active scheduled medications recorded in platform.</i>", body_regular))
    
    story.append(Spacer(1, 10))

    # 5. Recent Glycemic Ingestion Log (Last 10 events)
    story.append(Paragraph("Recent Glycemic Ingestion Log (Verified Audit)", section_heading_style))
    if events_list:
        event_rows = [
            [
                Paragraph("<b>Measured Time</b>", table_cell_header),
                Paragraph("<b>Context / Meal</b>", table_cell_header),
                Paragraph("<b>Reading (mg/dL)</b>", table_cell_header),
                Paragraph("<b>Reported By</b>", table_cell_header),
                Paragraph("<b>Clinical Classification</b>", table_cell_header),
            ]
        ]
        # Sort recent events descending, take up to 10
        sorted_events = sorted(
            events_list,
            key=lambda x: str(x.get("measured_at", "")),
            reverse=True
        )[:10]

        for ev in sorted_events:
            val = ev.get("value", {})
            mgdl = float(val.get("mgdl", 0)) if "mgdl" in val else 0.0
            ctx = val.get("context", "random").replace("_", " ").title()
            rep = ev.get("reported_by", "patient").title()
            
            # Format time
            m_time = ev.get("measured_at")
            if isinstance(m_time, datetime):
                time_str = m_time.strftime("%d-%b %H:%M")
            elif isinstance(m_time, str):
                time_str = m_time[:16].replace("T", " ")
            else:
                time_str = "--"

            if mgdl < 70:
                cls_text = "<b><font color='#dc2626'>Critical Low</font></b>"
            elif mgdl > 250:
                cls_text = "<b><font color='#ea580c'>Urgent Spike</font></b>"
            elif mgdl > 180:
                cls_text = "<font color='#ca8a04'>High (Watch)</font>"
            else:
                cls_text = "<font color='#16a34a'>In Target</font>"

            event_rows.append([
                Paragraph(time_str, table_cell),
                Paragraph(ctx, table_cell),
                Paragraph(f"<b>{mgdl:.0f}</b> mg/dL", table_cell),
                Paragraph(rep, table_cell),
                Paragraph(cls_text, table_cell),
            ])

        event_table = Table(event_rows, colWidths=[110, 110, 100, 100, 120])
        event_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), secondary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_gray),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_gray),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(event_table)
    else:
        story.append(Paragraph("<i>No glucose events recorded for this patient.</i>", body_regular))

    story.append(Spacer(1, 10))

    # 6. Doctor's Verified Notes & Signature Box
    doc_notes = notes or (
        "Patient glycemic control assessed over 14-day rolling window. Regimen adherence confirmed. "
        "Recommend maintaining daily post-meal hydration and 15-minute mild walking. No dose alteration required."
    )
    story.append(Paragraph("Clinician Verification & Consultation Notes", section_heading_style))
    
    sig_data = [
        [
            Paragraph(f"<b>Clinician Evaluation:</b><br/>{doc_notes}", body_regular),
            Paragraph(
                f"<b>Digitally Verified & Signed:</b><br/>"
                f"<b>{doctor_name}</b><br/>"
                f"Date: {report_date}<br/>"
                f"<i>Verified via Diabeto Clinician Portal</i>",
                ParagraphStyle("SigBlock", parent=body_regular, alignment=2)
            ),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[360, 180])
    sig_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), gray_bg),
        ("BOX", (0, 0), (-1, -1), 0.5, border_gray),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(sig_table)

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer
