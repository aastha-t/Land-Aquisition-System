import io
from django.utils import timezone
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def get_base_styles():
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        'GovHeader',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        textColor=colors.HexColor('#0F2942'),
        alignment=1, # Center
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        'GovSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#334E68'),
        alignment=1,
        spaceAfter=15,
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
    )
    bold_cell_style = ParagraphStyle(
        'BoldTableCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
    )
    return styles, header_style, sub_style, cell_style, bold_cell_style


def build_pdf_document(title, subtitle, table_headers, table_data, col_widths=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    elements = []
    styles, header_style, sub_style, cell_style, bold_cell_style = get_base_styles()

    # Title & Metadata
    elements.append(Paragraph("GOVERNMENT OF INDIA", sub_style))
    elements.append(Paragraph("NATIONAL LAND ACQUISITION & MANAGEMENT SYSTEM", header_style))
    elements.append(Paragraph(f"{title} | Generated: {timezone.now().strftime('%d %B %Y, %I:%M %p')}", sub_style))
    elements.append(Spacer(1, 10))

    # Prepare table elements with Paragraphs
    formatted_data = []
    
    # Headers
    header_row = [Paragraph(f"<b>{h}</b>", bold_cell_style) for h in table_headers]
    formatted_data.append(header_row)

    # Rows
    for row in table_data:
        formatted_row = [Paragraph(str(item), cell_style) for item in row]
        formatted_data.append(formatted_row)

    table = Table(formatted_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<i>* This is an official digital record generated from the National Land Acquisition Portal for academic and decision support demonstration.</i>", cell_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
