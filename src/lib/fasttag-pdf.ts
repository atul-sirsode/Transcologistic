/**
 * FastTag PDF Generation
 * Generates a printable PDF statement with bank logo placeholder
 */

import { format } from "date-fns";

interface PdfHistoryEntry {
  processingTime: string;
  transactionTime: string;
  nature: "Debit" | "Credit";
  amount: string;
  closingBalance: string;
  description: string;
  txnId: string;
}

interface PdfSessionData {
  bankName: string;
  vehicleNumber: string;
  customerName: string;
  truckNumber: string;
  truckOwnerName: string;
  openingBalance: string;
  startDate?: Date;
  endDate?: Date;
}

// Bank color/branding config for placeholder logos
const BANK_BRANDS: Record<string, { color: string; abbr: string }> = {
  "IDFC First Bank | Blackbuck": { color: "#6A1B9A", abbr: "IDFC" },
  "IDBI Bank | Park +": { color: "#00695C", abbr: "IDBI" },
  "Axis Bank": { color: "#97144D", abbr: "AXIS" },
  "ICICI Bank": { color: "#F37021", abbr: "ICICI" },
  "HDFC Bank": { color: "#004B87", abbr: "HDFC" },
  "State Bank of India": { color: "#22409A", abbr: "SBI" },
};

function getBankBrand(bankName: string) {
  return (
    BANK_BRANDS[bankName] || {
      color: "#333333",
      abbr: bankName.substring(0, 4).toUpperCase(),
    }
  );
}

export function generateFastTagPDF(
  session: PdfSessionData,
  history: PdfHistoryEntry[],
): void {
  const brand = getBankBrand(session.bankName);
  const dateRange = `${session.startDate ? format(session.startDate, "dd MMM yyyy") : "—"} to ${session.endDate ? format(session.endDate, "dd MMM yyyy") : "—"}`;
  const finalBalance =
    history.length > 0
      ? history[history.length - 1].closingBalance
      : session.openingBalance;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>FastTag Statement - ${session.vehicleNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222; background: #fff; padding: 30px; }
  .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid ${brand.color}; padding-bottom: 20px; margin-bottom: 24px; }
  .bank-logo { width: 80px; height: 80px; border-radius: 12px; background: ${brand.color}; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
  .header-info h1 { font-size: 22px; color: ${brand.color}; }
  .header-info p { font-size: 13px; color: #666; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 24px; background: #f8f9fa; padding: 16px; border-radius: 8px; }
  .meta-item label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .meta-item p { font-size: 14px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th { background: ${brand.color}; color: #fff; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #f9fafb; }
  .debit { color: #dc2626; font-weight: 600; }
  .credit { color: #16a34a; font-weight: 600; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  .summary { display: flex; justify-content: space-between; margin-top: 16px; padding: 12px 16px; background: ${brand.color}11; border-radius: 8px; border: 1px solid ${brand.color}33; }
  .summary-item label { font-size: 11px; color: #666; }
  .summary-item p { font-size: 16px; font-weight: 700; color: ${brand.color}; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="bank-logo">${brand.abbr}</div>
    <div class="header-info">
      <h1>${session.bankName}</h1>
      <p>FASTag Account Statement</p>
      <p style="margin-top:2px">Period: ${dateRange}</p>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><label>Vehicle Number</label><p>${session.vehicleNumber}</p></div>
    <div class="meta-item"><label>Customer Name</label><p>${session.customerName || "—"}</p></div>
    <div class="meta-item"><label>Truck Number</label><p>${session.truckNumber || "—"}</p></div>
    <div class="meta-item"><label>Truck Owner</label><p>${session.truckOwnerName || "—"}</p></div>
  </div>

  <div class="summary">
    <div class="summary-item"><label>Opening Balance</label><p>₹ ${session.openingBalance}</p></div>
    <div class="summary-item"><label>Total Transactions</label><p>${history.length}</p></div>
    <div class="summary-item"><label>Closing Balance</label><p>₹ ${finalBalance}</p></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Processing Time</th>
        <th>Transaction Time</th>
        <th>Nature</th>
        <th>Amount (₹)</th>
        <th>Closing Bal (₹)</th>
        <th>Description</th>
        <th>Txn ID</th>
      </tr>
    </thead>
    <tbody>
      ${history
        .map(
          (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.processingTime ? formatDateTime(e.processingTime) : "—"}</td>
        <td>${e.transactionTime ? formatDateTime(e.transactionTime) : "—"}</td>
        <td class="${e.nature.toLowerCase()}">${e.nature}</td>
        <td>${e.amount}</td>
        <td>${e.closingBalance}</td>
        <td>${e.description}</td>
        <td style="font-family:monospace;font-size:10px">${e.txnId}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <p>This is a system-generated statement. Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
    <p style="margin-top:4px">${session.bankName} — FASTag Services</p>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

function formatDateTime(dt: string): string {
  try {
    return format(new Date(dt), "dd MMM yy, hh:mm a");
  } catch {
    return dt;
  }
}
