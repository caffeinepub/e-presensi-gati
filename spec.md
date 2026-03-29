# E-Presensi GATI

## Current State
App has a "Rekap Desa & Bulan" button that downloads a PDF with all data (recap per village, per month, cross-table). No filtering before download.

## Requested Changes (Diff)

### Add
- A filter dialog/modal that appears when user clicks "Rekap Desa & Bulan"
- Filter options: multi-select desa (checkboxes, populated from actual data), multi-select bulan (checkboxes, populated from actual data)
- "Download" button inside dialog that generates PDF only for selected desa & bulan
- "Semua" checkbox shortcut to select/deselect all desa or all bulan

### Modify
- `handleDownloadRekapPDF` in App.tsx: instead of immediately generating PDF, open a filter dialog first
- PDF generation uses filtered records based on selected desa & bulan

### Remove
- Nothing removed

## Implementation Plan
1. Add state for filter dialog open/close, selected desas, selected months
2. Build a Dialog component with two sections: desa checkboxes and bulan checkboxes
3. Populate options from actual records data
4. On confirm, filter records and pass to PDF generator
5. Ensure stable data is preserved (backend is already stable)
