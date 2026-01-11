// Data export utilities (CSV, PDF, JSON)

export interface ExportData {
  type: "reports" | "risk_data" | "water_quality" | "analytics";
  data: any[];
  filename?: string;
}

// CSV Export
export const exportToCSV = (data: any[], filename: string = "export"): void => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// JSON Export
export const exportToJSON = (data: any, filename: string = "export"): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// PDF Export (using browser print)
export const exportToPDF = (elementId: string, filename: string = "export"): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Element not found for PDF export");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate PDF");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
};

// Export Reports
export const exportReports = (reports: any[]): void => {
  const exportData = reports.map((r) => ({
    ID: r.id,
    Type: r.type,
    Region: r.region,
    Description: r.description,
    Status: r.status,
    Date: r.date,
    Verified_By: r.verified_by || "N/A",
    Responses: r.responses,
    Anonymous: r.anonymous ? "Yes" : "No",
  }));
  exportToCSV(exportData, "community_reports");
};

// Export Risk Data
export const exportRiskData = (riskData: any[]): void => {
  const exportData = riskData.map((r) => ({
    State: r.state || r.location,
    Disease: r.primaryThreat || r.disease || "N/A",
    "Overall Risk": r.overallRisk,
    "Dengue Risk": `${r.dengueRisk}%`,
    "Respiratory Risk": `${r.respiratoryRisk}%`,
    "Water Risk": `${r.waterRisk}%`,
    Temperature: `${r.environmentalFactors?.temp || 0}°C`,
    Humidity: `${r.environmentalFactors?.humidity || 0}%`,
    "PM2.5": r.environmentalFactors?.pm25 || 0,
    "Water Quality": r.environmentalFactors?.waterQuality || "Unknown",
  }));
  exportToCSV(exportData, "risk_assessment");
};

// Export Water Quality Data
export const exportWaterQuality = (sources: any[]): void => {
  const exportData = sources.map((s) => ({
    "Source Name": s.name,
    Type: s.type,
    Region: s.region,
    "pH Level": s.ph_level,
    "Bacterial Count": s.bacterial_count,
    "Contamination Level": s.contamination_level,
    "Quality Score": s.quality_score,
    "Last Tested": s.last_tested,
  }));
  exportToCSV(exportData, "water_quality");
};

