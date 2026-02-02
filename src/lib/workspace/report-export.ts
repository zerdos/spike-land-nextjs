import { jsPDF } from "jspdf";
import Papa from "papaparse";

/**
 * Export data to CSV string
 * @param data Array of objects to export
 * @returns CSV string
 */
export function exportToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return "";
  }
  return Papa.unparse(data);
}

/**
 * Download CSV file (browser-side helper)
 * @param csvContent CSV string content
 * @param filename Filename including .csv extension
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Generate PDF report (simple version)
 * Note: For complex layouts, consider generating HTML and using html2canvas or similar.
 * This implementation creates a basic text-based report.
 */
export function generatePDF(
  title: string,
  summary: Record<string, number | string>,
  details: any[],
): jsPDF {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text(title, 20, yPos);
  yPos += 15;

  // Summary Section
  doc.setFontSize(14);
  doc.text("Summary", 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  Object.entries(summary).forEach(([key, value]) => {
    // Format key from camelCase to Title Case
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
    doc.text(`${label}: ${value}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Details Table (Simple text loop for now)
  // Ideally use jspdf-autotable for real tables
  doc.setFontSize(14);
  doc.text("Workspace Details", 20, yPos);
  yPos += 10;

  doc.setFontSize(9);
  const headers = Object.keys(details[0] || {}).join(" | ");
  doc.text(headers, 20, yPos);
  yPos += 7;

  details.forEach((row) => {
    const rowText = Object.values(row).join(" | ");

    // Check page break
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(rowText.substring(0, 90) + (rowText.length > 90 ? "..." : ""), 20, yPos);
    yPos += 6;
  });

  return doc;
}
