#!/usr/bin/env python
import csv
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def create_excel_template():
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------
    # TAB 1: Instructions & Reference
    # -------------------------------------------------------------
    ws_ref = wb.active
    ws_ref.title = "Instructions & Reference"
    ws_ref.views.sheetView[0].showGridLines = True
    
    # Colors
    navy_fill = PatternFill(start_color="0C1224", end_color="0C1224", fill_type="solid")
    light_blue_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    card_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    zebra_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    
    # Fonts
    title_font = Font(name="Segoe UI", size=16, bold=True, color="0C1224")
    section_font = Font(name="Segoe UI", size=12, bold=True, color="1E3A8A")
    header_font_white = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    normal_font = Font(name="Segoe UI", size=10, color="334155")
    bold_font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
    italic_font = Font(name="Segoe UI", size=9, italic=True, color="64748B")
    
    # Alignments
    left_align = Alignment(horizontal="left", vertical="center")
    center_align = Alignment(horizontal="center", vertical="center")
    
    # Borders
    thin_border_side = Side(style='thin', color='CBD5E1')
    thin_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    thick_bottom = Border(bottom=Side(style='medium', color='0C1224'))

    # Sheet Title
    ws_ref.cell(row=2, column=2, value="PulseEV — Centralized EV Lifecycle Intelligence").font = title_font
    ws_ref.cell(row=3, column=2, value="Bulk Upload & Import Instructions").font = Font(name="Segoe UI", size=11, italic=True, color="475569")
    
    # General Steps Section
    ws_ref.cell(row=5, column=2, value="HOW TO USE THIS TEMPLATE:").font = section_font
    instructions = [
        "1. Complete the 'EV Import Template' tab with your vehicle records.",
        "2. To UPDATE an existing EV profile: Ensure the 'vin' matches an existing vehicle in PulseEV.",
        "3. To ADD a new EV profile: Input a new 17-digit VIN. Other fields will be initialized to their defaults if empty.",
        "4. Column headers must remain exactly as named. Do not delete or rename any headers.",
        "5. Save this Excel sheet, or export/save the template tab as a CSV file.",
        "6. In the PulseEV dashboard, click the 'Import' button in the header actions, and select your file."
    ]
    for idx, inst in enumerate(instructions):
        cell = ws_ref.cell(row=6 + idx, column=2, value=inst)
        cell.font = normal_font
        cell.alignment = left_align

    # Field Reference Header
    ws_ref.cell(row=14, column=2, value="FIELD DATA DICTIONARY:").font = section_font
    
    ref_headers = ["Field (Column)", "Required?", "Accepted Values / Format", "Description & Rules"]
    for col_idx, h in enumerate(ref_headers, start=2):
        cell = ws_ref.cell(row=15, column=col_idx, value=h)
        cell.font = header_font_white
        cell.fill = navy_fill
        cell.alignment = center_align
        cell.border = thin_border
    ws_ref.row_dimensions[15].height = 24

    field_rules = [
        ("vin", "YES", "17-digit alphanumeric string", "Unique Vehicle Identification Number. Used as key for updating records."),
        ("model", "YES", "Comet / Cosmo", "EV Model Variant. Select from dropdown."),
        ("chassisNo", "YES", "Alphanumeric string (e.g. CH-2024-0001)", "Chassis serial identification number."),
        ("motorNo", "YES", "Alphanumeric string (e.g. MT-ZF-78001)", "Electric Motor serial identification number."),
        ("controllerNo", "NO", "Alphanumeric string (e.g. CT-INV-44001)", "Controller unit serial number."),
        ("batteryPackNo", "NO", "Alphanumeric string (e.g. BP-LFP-96001)", "Active Battery Pack serial number."),
        ("manufacturingDate", "YES", "YYYY-MM-DD (Date)", "Date of factory assembly/manufacturing completion."),
        ("customerName", "YES", "Full Name string", "Assigned customer owner's name."),
        ("customerPhone", "YES", "Phone pattern (e.g. +91-98765-43210)", "Contact mobile/WhatsApp number."),
        ("customerLocation", "YES", "City, State (e.g. Mumbai, MH)", "Delivery region / operational city location."),
        ("deliveryDate", "YES", "YYYY-MM-DD (Date)", "Date of vehicle handover to customer."),
        ("currentKm", "NO", "Positive integer (e.g. 1500)", "Current odometer reading in kilometers (Defaults to 0)."),
        ("registrationStatus", "NO", "delivered / documents_pending / submitted / completed", "Current status of RTO registration."),
        ("registrationNumber", "NO", "Registration plate string (e.g. MH-02-XX-1234)", "Assigned RTO vehicle registration plate number."),
        ("batteryReplacementAffected", "NO", "TRUE / FALSE", "Whether vehicle is part of a battery replacement campaign."),
        ("batteryReplacementCampaignId", "NO", "Alphanumeric string (e.g. BC-2024-001)", "Recall or upgrade campaign reference ID."),
        ("batteryReplacementStatus", "NO", "not_affected / pending / in_progress / completed", "Upgrade campaign implementation status."),
        ("batteryReplacementOldSerial", "NO", "Alphanumeric string", "Serial number of the decommissioned battery."),
        ("batteryReplacementNewSerial", "NO", "Alphanumeric string", "Serial number of the newly fitted battery pack."),
        ("batteryReplacementDate", "NO", "YYYY-MM-DD (Date)", "Date of battery service upgrade completion."),
        ("batteryReplacementTechnician", "NO", "Technician Name string", "Technician who carried out the replacement."),
        ("batteryReplacementCustomerConfirmed", "NO", "TRUE / FALSE", "Customer signed-off/confirmed the upgrade.")
    ]

    for row_idx, rule in enumerate(field_rules, start=16):
        is_zebra = (row_idx % 2 == 0)
        for col_idx, val in enumerate(rule, start=2):
            cell = ws_ref.cell(row=row_idx, column=col_idx, value=val)
            cell.font = normal_font
            cell.border = thin_border
            if col_idx == 2:
                cell.font = bold_font
            if col_idx == 3:
                cell.alignment = center_align
                if val == "YES":
                    cell.font = Font(name="Segoe UI", size=10, bold=True, color="B91C1C")
            if is_zebra:
                cell.fill = zebra_fill
        ws_ref.row_dimensions[row_idx].height = 20

    # Auto column scaling for instructions sheet
    for col in ws_ref.columns:
        if col[0].column < 2 or col[0].column > 5:
            continue
        max_len = 0
        for cell in col:
            if cell.row >= 15:
                max_len = max(max_len, len(str(cell.value or '')))
        col_letter = get_column_letter(col[0].column)
        ws_ref.column_dimensions[col_letter].width = max(max_len + 4, 15)

    ws_ref.column_dimensions['A'].width = 3
    ws_ref.column_dimensions['B'].width = 35
    ws_ref.column_dimensions['C'].width = 12
    ws_ref.column_dimensions['D'].width = 45
    ws_ref.column_dimensions['E'].width = 65

    # -------------------------------------------------------------
    # TAB 2: EV Import Template
    # -------------------------------------------------------------
    ws_tpl = wb.create_sheet(title="EV Import Template")
    ws_tpl.views.sheetView[0].showGridLines = True
    
    headers = [
        "vin", "model", "chassisNo", "motorNo", "controllerNo", "batteryPackNo",
        "manufacturingDate", "customerName", "customerPhone", "customerLocation",
        "deliveryDate", "currentKm", "registrationStatus", "registrationNumber",
        "batteryReplacementAffected", "batteryReplacementCampaignId", "batteryReplacementStatus",
        "batteryReplacementOldSerial", "batteryReplacementNewSerial", "batteryReplacementDate",
        "batteryReplacementTechnician", "batteryReplacementCustomerConfirmed"
    ]
    
    # Styled headers
    for col_idx, h in enumerate(headers, start=1):
        cell = ws_tpl.cell(row=1, column=col_idx, value=h)
        cell.font = header_font_white
        cell.fill = navy_fill
        cell.alignment = center_align
        cell.border = thin_border
    ws_tpl.row_dimensions[1].height = 28
    
    # Sample Row 1 (Comet)
    sample_1 = [
        "MAT45678901234501", "Comet", "CH-2024-0001", "MT-ZF-78001", "CT-INV-44001", "BP-LFP-96001",
        "2024-01-10", "Rajesh Mehra", "+91-9876543201", "Mumbai, MH",
        "2024-02-15", 12500, "completed", "MH-02-XX-1234",
        "TRUE", "BC-2024-001", "completed", "BP-LFP-96001", "BP-LFP-96001-R", "2024-07-20",
        "Arjun Patel", "TRUE"
    ]
    
    # Sample Row 2 (Cosmo)
    sample_2 = [
        "MAT45678901234502", "Cosmo", "CH-2024-0002", "MT-ZF-78002", "CT-INV-44002", "BP-NMC-72002",
        "2024-02-05", "Priya Sharma", "+91-9876543202", "Delhi, DL",
        "2024-03-01", 8700, "completed", "DL-3C-AB-5678",
        "TRUE", "BC-2024-001", "pending", "BP-NMC-72002", "", "",
        "", "FALSE"
    ]
    
    for row_idx, sample in enumerate([sample_1, sample_2], start=2):
        for col_idx, val in enumerate(sample, start=1):
            cell = ws_tpl.cell(row=row_idx, column=col_idx, value=val)
            cell.font = italic_font
            cell.alignment = left_align
            cell.border = thin_border
            # Color samples slightly differently so users know they are templates/examples
            cell.fill = zebra_fill
        ws_tpl.row_dimensions[row_idx].height = 20

    # Auto sizing columns for template sheet
    for col in ws_tpl.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_tpl.column_dimensions[col_letter].width = max(max_len + 4, 12)

    # Data Validations (Dropdown limits)
    # 1. Model Validation (Col B)
    dv_model = DataValidation(type="list", formula1='"Comet,Cosmo"', allow_blank=True)
    dv_model.error = 'Your entry is not in the list of allowed vehicle models (Comet, Cosmo)'
    dv_model.errorTitle = 'Invalid Model'
    dv_model.prompt = 'Please select Comet or Cosmo'
    dv_model.promptTitle = 'Select EV Model'
    ws_tpl.add_data_validation(dv_model)
    dv_model.add("B2:B100")

    # 2. Registration Status Validation (Col M)
    dv_reg = DataValidation(type="list", formula1='"delivered,documents_pending,submitted,completed"', allow_blank=True)
    dv_reg.error = 'Must choose delivered, documents_pending, submitted, or completed'
    dv_reg.errorTitle = 'Invalid Registration Status'
    dv_reg.prompt = 'Select registration stage'
    dv_reg.promptTitle = 'Select Status'
    ws_tpl.add_data_validation(dv_reg)
    dv_reg.add("M2:M100")

    # 3. Battery Replacement Status Validation (Col Q)
    dv_bat_status = DataValidation(type="list", formula1='"not_affected,pending,in_progress,completed"', allow_blank=True)
    dv_bat_status.error = 'Must choose not_affected, pending, in_progress, or completed'
    dv_bat_status.errorTitle = 'Invalid Upgrade Status'
    ws_tpl.add_data_validation(dv_bat_status)
    dv_bat_status.add("Q2:Q100")

    # 4. Booleans (Cols O, V)
    dv_bool = DataValidation(type="list", formula1='"TRUE,FALSE"', allow_blank=True)
    dv_bool.error = 'Must enter TRUE or FALSE'
    dv_bool.errorTitle = 'Invalid Boolean Value'
    ws_tpl.add_data_validation(dv_bool)
    dv_bool.add("O2:O100")
    dv_bool.add("V2:V100")

    wb.save("ev_lifecycle_template.xlsx")
    print("Excel template 'ev_lifecycle_template.xlsx' created successfully.")

def create_csv_template():
    headers = [
        "vin", "model", "chassisNo", "motorNo", "controllerNo", "batteryPackNo",
        "manufacturingDate", "customerName", "customerPhone", "customerLocation",
        "deliveryDate", "currentKm", "registrationStatus", "registrationNumber",
        "batteryReplacementAffected", "batteryReplacementCampaignId", "batteryReplacementStatus",
        "batteryReplacementOldSerial", "batteryReplacementNewSerial", "batteryReplacementDate",
        "batteryReplacementTechnician", "batteryReplacementCustomerConfirmed"
    ]
    sample_row = [
        "MAT45678901234501", "Comet", "CH-2024-0001", "MT-ZF-78001", "CT-INV-44001", "BP-LFP-96001",
        "2024-01-10", "Rajesh Mehra", "+91-9876543201", "Mumbai, MH",
        "2024-02-15", "12500", "completed", "MH-02-XX-1234",
        "TRUE", "BC-2024-001", "completed", "BP-LFP-96001", "BP-LFP-96001-R", "2024-07-20",
        "Arjun Patel", "TRUE"
    ]
    
    with open("ev_lifecycle_template.csv", mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerow(sample_row)
    print("CSV template 'ev_lifecycle_template.csv' created successfully.")

if __name__ == "__main__":
    create_excel_template()
    create_csv_template()
