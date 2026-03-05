/**
 * FastTag Report PDF Generation
 * Generates a consolidated report PDF for multiple sessions filtered by bank & date range.
 */

import { format } from "date-fns";
import type {
  FastTagReportRow,
  FastTagReportFilter,
} from "@/models/fasttag-report";

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

function formatDT(dt: string | null): string {
  if (!dt) return "—";
  try {
    return format(new Date(dt), "dd MMM yy, hh:mm a");
  } catch {
    return dt;
  }
}

export function generateReportPDF(
  filter: FastTagReportFilter,
  rows: FastTagReportRow[],
): void {
  const brand = getBankBrand(filter.bankName);
  const dateRange = `${format(filter.startDate, "dd MMM yyyy")} to ${format(filter.endDate, "dd MMM yyyy")}`;
  const totalTxns = rows.reduce((sum, r) => sum + r.transactions.length, 0);

  const sessionsHtml = rows
    .map((row, si) => {
      const s = row.session;
      const txns = row.transactions;
      return `
      <div class="session-block">
        <div class="session-header">
          <strong>#${si + 1} — ${s.vehicle_number}</strong>
          <span>${s.customer_name || "—"} | Opening: ₹${s.opening_balance}</span>
        </div>
        ${
          txns.length === 0
            ? '<p class="no-txn">No transactions</p>'
            : `
        <table>
          <thead><tr>
            <th>#</th><th>Processing Time</th><th>Transaction Time</th><th>Nature</th>
            <th>Amount (₹)</th><th>Closing Bal (₹)</th><th>Description</th><th>Txn ID</th>
          </tr></thead>
          <tbody>${txns
            .map(
              (t, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${formatDT(t.processing_time)}</td>
              <td>${formatDT(t.transaction_time)}</td>
              <td class="${t.nature.toLowerCase()}">${t.nature}</td>
              <td>${t.amount}</td><td>${t.closing_balance}</td>
              <td>${t.description || "—"}</td>
              <td style="font-family:monospace;font-size:10px">${t.txn_id || "—"}</td>
            </tr>`,
            )
            .join("")}
          </tbody>
        </table>`
        }
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>FastTag Report - ${filter.bankName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#222;background:#fff;padding:30px}
  .header{display:flex;align-items:center;gap:20px;border-bottom:3px solid ${brand.color};padding-bottom:20px;margin-bottom:24px}
  .bank-logo{width:70px;height:70px;border-radius:12px;background:${brand.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:800}
  .header-info h1{font-size:20px;color:${brand.color}}
  .header-info p{font-size:12px;color:#666;margin-top:3px}
  .summary{display:flex;gap:24px;margin-bottom:24px;padding:12px 16px;background:${brand.color}11;border-radius:8px;border:1px solid ${brand.color}33}
  .summary-item label{font-size:11px;color:#666}
  .summary-item p{font-size:15px;font-weight:700;color:${brand.color}}
  .session-block{margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
  .session-header{display:flex;justify-content:space-between;align-items:center;background:#f8f9fa;padding:10px 14px;font-size:13px}
  .no-txn{text-align:center;color:#999;padding:12px;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:${brand.color};color:#fff;padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:6px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even){background:#f9fafb}
  .debit{color:#dc2626;font-weight:600}
  .credit{color:#16a34a;font-weight:600}
  .footer{margin-top:30px;text-align:center;font-size:11px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px}
  @media print{body{padding:10px}}
</style></head><body>
  <div class="header">
    <div class="bank-logo">${brand.abbr}</div>
    <div class="header-info">
      <h1>${filter.bankName} — FastTag Report</h1>
      <p>Period: ${dateRange}</p>
    </div>
  </div>
  <div class="summary">
    <div class="summary-item"><label>Sessions</label><p>${rows.length}</p></div>
    <div class="summary-item"><label>Total Transactions</label><p>${totalTxns}</p></div>
  </div>
  ${sessionsHtml}
  <div class="footer">
    <p>Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
  </div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }
}
