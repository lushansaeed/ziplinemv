export const DEFAULT_BOOKING_CONFIRMATION_SUBJECT = "Your Zipline Booking is Confirmed - {{bookingReference}}";

export const DEFAULT_BOOKING_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f4f4f0; font-family: 'Trebuchet MS', Arial, sans-serif; }
    .email-wrap { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .email-card { background: #ffffff; border-radius: 12px; overflow: hidden; border: 0.5px solid #ddd; }
    .header { background: #862219; padding: 36px 32px 28px; text-align: center; }
    .header-tagline { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #fab8a4; margin-bottom: 8px; }
    .header-title { font-size: 26px; font-weight: 700; color: #ffffff; font-family: Georgia, serif; line-height: 1.2; margin-bottom: 4px; }
    .header-sub { font-size: 13px; color: #fab8a4; margin-top: 6px; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, #fcb343, #f36c23, #862219); }
    .body { padding: 32px; }
    .greeting { font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 20px; }
    .badge-row { margin-bottom: 24px; }
    .badge { display: inline-block; background: #fff4ee; color: #862219; border: 1px solid #fab8a4; border-radius: 20px; padding: 5px 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin: 0 6px 8px 0; }
    .badge.green { background: #eaf3de; color: #3b6d11; border-color: #97c459; }
    .section-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #862219; margin-bottom: 12px; font-weight: 700; }
    .booking-box { background: #fdf5f3; border: 1px solid #fab8a4; border-radius: 10px; padding: 20px 22px; margin-bottom: 22px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 0.5px solid #f0d5cc; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-value { font-size: 14px; color: #222; font-weight: 600; text-align: right; }
    .total-row { background: #862219; border-radius: 8px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
    .total-label { font-size: 13px; color: #fab8a4; font-weight: 600; }
    .total-amount { font-size: 20px; color: #ffffff; font-weight: 700; }
    .waiver-box { background: #fff8ed; border: 1.5px solid #fcb343; border-radius: 10px; padding: 20px 22px; margin-bottom: 22px; }
    .waiver-title { font-size: 15px; font-weight: 700; color: #333; margin-bottom: 6px; }
    .waiver-desc { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 14px; }
    .waiver-btn { display: inline-block; background: #f36c23; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 11px 24px; border-radius: 8px; letter-spacing: 0.3px; }
    .waiver-note { font-size: 11px; color: #999; margin-top: 10px; font-style: italic; }
    .qr-wrap { text-align: center; margin-top: 16px; }
    .qr-wrap img { width: 128px; height: 128px; border: 1px solid #f0d5cc; border-radius: 8px; padding: 6px; background: #fff; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px; }
    .info-card { background: #f8f8f6; border-radius: 8px; padding: 14px 16px; }
    .info-card-title { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .info-card-value { font-size: 13px; color: #333; line-height: 1.5; }
    .divider { height: 0.5px; background: #eee; margin: 20px 0; }
    .reminder-list { list-style: none; padding: 0; }
    .reminder-list li { font-size: 13px; color: #555; padding: 5px 0 5px 22px; line-height: 1.5; }
    .footer { background: #1a0f0e; padding: 28px 32px; text-align: center; }
    .footer-logo { font-family: Georgia, serif; font-size: 18px; color: #ffffff; font-weight: 700; margin-bottom: 4px; }
    .footer-tagline { font-size: 11px; color: #fab8a4; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px; }
    .footer-links { margin-bottom: 14px; }
    .footer-links a { color: #fcb343; font-size: 12px; text-decoration: none; margin: 0 10px; }
    .footer-contact { font-size: 12px; color: #888; line-height: 1.8; }
    .footer-contact a { color: #fab8a4; text-decoration: none; }
    .ocean-wave { background: #862219; height: 18px; }
    .ref-code { font-size: 22px; font-weight: 800; color: #862219; letter-spacing: 3px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="email-wrap">
    <div class="email-card">
      <div class="header">
        <div class="header-tagline">Zipline Maldives · Vahmaafushi</div>
        <div class="header-title">Your Booking is Confirmed!</div>
        <div class="header-sub">The World's Most Beautiful Zipline - 428m over the Indian Ocean</div>
      </div>
      <div class="accent-bar"></div>
      <div class="body">
        <p class="greeting">
          Dear <strong>{{customerName}}</strong>,<br><br>
          Your zipline adventure is officially booked! We're thrilled to have you fly with us at Zipline Maldives between Maafushi and Vahmaafushi.
        </p>
        <div class="badge-row">
          <span class="badge green">Confirmed</span>
          <span class="badge">Ref: <span class="ref-code">{{bookingReference}}</span></span>
        </div>
        <div class="section-title">Booking Details</div>
        <div class="booking-box">
          <div class="detail-row"><span class="detail-label">Guest Name</span><span class="detail-value">{{customerName}}</span></div>
          <div class="detail-row"><span class="detail-label">Date of Experience</span><span class="detail-value">{{rideDate}}</span></div>
          <div class="detail-row"><span class="detail-label">Reporting Time</span><span class="detail-value">{{reportingTime}}</span></div>
          <div class="detail-row"><span class="detail-label">Meeting Point</span><span class="detail-value">Maafushi Jetty, Maafushi Island</span></div>
          <div class="detail-row"><span class="detail-label">Guests</span><span class="detail-value">{{numberOfRiders}}</span></div>
          <div class="detail-row"><span class="detail-label">Add-ons</span><span class="detail-value">{{addonsSummary}}</span></div>
          <div class="detail-row"><span class="detail-label">Booked Via</span><span class="detail-value">{{bookedVia}}</span></div>
        </div>
        <div class="total-row">
          <span class="total-label">Total Amount</span>
          <span class="total-amount">{{currency}} {{totalAmount}}</span>
        </div>
        <div class="waiver-box">
          <div class="waiver-title">Complete Your Safety Waiver</div>
          <div class="waiver-desc">
            To reduce waiting time at the counter, please complete the waiver form before your arrival. Each rider must complete a waiver form before the ride. Minors under 18 require a parent or guardian to sign on their behalf.
          </div>
          <a href="{{waiverLink}}" class="waiver-btn">Sign Waiver Form Now</a>
          <div class="waiver-note">Waivers must be completed before your session. Walk-in completion may delay your start time.</div>
          {{qrCodeBlock}}
        </div>
        <div class="info-grid">
          <div class="info-card"><div class="info-card-title">Weight Limit</div><div class="info-card-value">40 kg - 110 kg<br><span style="font-size:11px;color:#aaa;">per participant</span></div></div>
          <div class="info-card"><div class="info-card-title">Duration</div><div class="info-card-value">~3-5 mins per ride<br><span style="font-size:11px;color:#aaa;">total visit ~30-45 mins</span></div></div>
          <div class="info-card"><div class="info-card-title">What to Wear</div><div class="info-card-value">Closed-toe shoes<br>Comfortable clothing</div></div>
          <div class="info-card"><div class="info-card-title">Weather Policy</div><div class="info-card-value">Rescheduled if unsafe<br>We'll notify you by WhatsApp</div></div>
        </div>
        <div class="divider"></div>
        <div class="section-title">Important Reminders</div>
        <ul class="reminder-list">
          <li>Arrive at least 15 minutes before your scheduled time</li>
          <li>Complete your waiver form online before you arrive</li>
          <li>Participants must weigh between 40 kg and 110 kg</li>
          <li>Loose items must be secured or stored</li>
          <li>Children under 18 must be accompanied by a guardian</li>
          <li>A speedboat transfer from Maafushi Jetty to Vahmaafushi is included</li>
        </ul>
        <div class="divider"></div>
        <p style="font-size:13px;color:#666;line-height:1.7;">
          Need to make changes? Contact us at least 24 hours before your session. For assistance, reach us at <a href="mailto:hello@vahmaafushi.com" style="color:#862219;text-decoration:none;font-weight:600;">hello@vahmaafushi.com</a> or <a href="tel:+9607773905" style="color:#862219;text-decoration:none;font-weight:600;">+960 777 3905</a>.
        </p>
      </div>
      <div class="ocean-wave"></div>
      <div class="footer">
        <div class="footer-logo">Zipline Maldives</div>
        <div class="footer-tagline">Fly Over Paradise</div>
        <div class="footer-links">
          <a href="https://zipline.mv">zipline.mv</a>
          <a href="https://instagram.com/zipline.mv">@zipline.mv</a>
          <a href="https://tiktok.com/@visit.vahmaafushi">@visit.vahmaafushi</a>
        </div>
        <div class="footer-contact">
          Vahmaafushi Island · Maafushi, Kaafu Atoll · Republic of Maldives<br>
          <a href="mailto:hello@vahmaafushi.com">hello@vahmaafushi.com</a> · <a href="tel:+9607773905">+960 777 3905</a><br><br>
          <span style="font-size:11px;color:#666;">Operated by Osvana Group Pvt Ltd · TGST Registered</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
