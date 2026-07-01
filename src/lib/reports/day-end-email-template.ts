export const DAY_END_EMAIL_RECIPIENTS_KEY = "email_day_end_report_recipients";
export const DAY_END_EMAIL_SUBJECT_KEY = "email_day_end_report_subject";
export const DAY_END_EMAIL_HTML_KEY = "email_day_end_report_html";

export const DEFAULT_DAY_END_EMAIL_SUBJECT =
  "Zipline Maldives - Daily sales - {{reportDate}} - {{mvrCollected}} / {{usdCollected}}";

export const DEFAULT_DAY_END_EMAIL_TEMPLATE = `<div style="background:#F4F1EA;padding:20px 16px;font-family:Trebuchet MS,Helvetica,Arial,sans-serif;">
  <div style="background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:8px;max-width:560px;margin:0 auto;">
    <div style="padding:24px 28px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><div style="font-size:10px;color:#6B6B6B;letter-spacing:.12em;text-transform:uppercase;">Vahmaafushi - Zipline Maldives</div><div style="font-size:20px;font-weight:500;margin-top:4px;">Daily sales report</div></td>
        <td align="right" style="font-size:12px;color:#6B6B6B;"><strong style="color:#1A1A1A;">{{reportDateLong}}</strong><br>Generated {{generatedTime}} MVT</td>
      </tr></table>
    </div>
    <div style="padding:0 28px;"><div style="height:2px;background:#D85A30;"></div></div>
    <div style="padding:22px 28px 4px;font-size:14px;line-height:1.7;color:#1A1A1A;">
      Hi team,<br><br>
      Attached is the daily sales report for <strong>{{reportDateLong}}</strong>. Counter reconciliation has been submitted by <strong>{{submittedBy}}</strong>.
    </div>
    <div style="padding:18px 28px 4px;">
      <div style="background:#F7F5EF;border-radius:8px;padding:18px 20px;">
        <div style="font-size:10px;color:#6B6B6B;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">Collected sales</div>
        <div style="font-size:28px;font-weight:500;color:#1A1A1A;">{{mvrCollected}} <span style="font-size:13px;color:#6B6B6B;">MVR</span></div>
        <div style="font-size:28px;font-weight:500;color:#1A1A1A;">{{usdCollected}} <span style="font-size:13px;color:#6B6B6B;">USD</span></div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;font-size:13px;">
          <tr><td style="padding:6px 0;color:#6B6B6B;">Bookings / riders</td><td align="right" style="font-weight:500;">{{bookingCount}} bookings - {{riderCount}} riders</td></tr>
          <tr><td style="padding:6px 0;color:#6B6B6B;">Cash drawer expected</td><td align="right" style="font-weight:500;">{{mvrCashExpected}} / {{usdCashExpected}}</td></tr>
          <tr><td style="padding:6px 0;color:#6B6B6B;">Card settlement</td><td align="right" style="font-weight:500;">{{mvrCard}} / {{usdCard}}</td></tr>
          <tr><td style="padding:6px 0;color:#6B6B6B;">Bank receipts</td><td align="right" style="font-weight:500;">{{mvrBank}} / {{usdBank}}</td></tr>
        </table>
      </div>
    </div>
    {{attentionBlock}}
    <div style="padding:20px 28px 0;font-size:14px;line-height:1.7;color:#1A1A1A;">Full breakdown is attached as PDF. The admin report is also available here: <a href="{{reportUrl}}" style="color:#D85A30;">open day-end report</a>.</div>
    <div style="padding:22px 28px 0;font-size:14px;line-height:1.7;color:#1A1A1A;">Best,<br><span style="color:#6B6B6B;">Zipline Maldives - Automated Reporting</span></div>
    <div style="padding:22px 28px 24px;font-size:10px;color:#9A9A9A;letter-spacing:.05em;border-top:1px solid rgba(0,0,0,.08);margin-top:18px;">Confidential - internal use only</div>
  </div>
</div>`;

export const DAY_END_EMAIL_PLACEHOLDERS = [
  "{{reportDate}}",
  "{{reportDateLong}}",
  "{{generatedTime}}",
  "{{location}}",
  "{{submittedBy}}",
  "{{bookingCount}}",
  "{{riderCount}}",
  "{{mvrCollected}}",
  "{{usdCollected}}",
  "{{mvrCashExpected}}",
  "{{usdCashExpected}}",
  "{{mvrCard}}",
  "{{usdCard}}",
  "{{mvrBank}}",
  "{{usdBank}}",
  "{{complimentaryMvr}}",
  "{{complimentaryUsd}}",
  "{{reportUrl}}",
  "{{pdfFileName}}",
  "{{attentionBlock}}",
];
