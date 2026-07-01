export const MEDIA_EMAIL_SUBJECT_KEY = "email_media_folder_subject";
export const MEDIA_EMAIL_HTML_KEY = "email_media_folder_html";

export const DEFAULT_MEDIA_EMAIL_SUBJECT =
  "Your Zipline Maldives photos and videos | {{bookingReference}}";

export const DEFAULT_MEDIA_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Your Zipline Maldives media</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { color: #D85A30; }
    @media only screen and (max-width: 560px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .hero-title { font-size: 26px !important; line-height: 1.25 !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .stack { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#F4F1EA; font-family:'Trebuchet MS','Helvetica Neue',Arial,sans-serif; color:#1A1A1A;">
  <div style="display:none; font-size:1px; color:#F4F1EA; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Your photos and videos from Vahmaafushi are on the way. We will have them ready within 24 hours.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F1EA;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
          <tr><td style="background:#D85A30; padding:6px 0; text-align:center; font-size:10px; color:#FFFFFF; letter-spacing:0.2em; text-transform:uppercase;">The World's Most Beautiful Zipline</td></tr>
          <tr>
            <td class="px" style="padding:32px 36px 8px; text-align:center;">
              <div style="font-size:11px; color:#6B6B6B; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:10px;">Zipline Maldives &middot; Vahmaafushi</div>
              <div class="hero-title" style="font-size:30px; font-weight:500; color:#1A1A1A; letter-spacing:-0.02em; line-height:1.2;">What a day, {{firstName}}.</div>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:22px 36px 0; text-align:center;">
              <div style="font-size:15px; color:#1A1A1A; line-height:1.75;">Thank you for flying the world's most beautiful zipline with us over Vahmaafushi. It was a joy having you on the line, and now the best part: we captured the whole thing.</div>
            </td>
          </tr>
          <tr>
            <td class="px" align="center" style="padding:24px 36px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:30px; height:2px; background:#D85A30;">&nbsp;</td><td style="padding:0 10px; font-size:12px; color:#D85A30;">&#10023;</td><td style="width:30px; height:2px; background:#D85A30;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:20px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F5EF; border-radius:12px;">
                <tr>
                  <td style="padding:26px 26px 24px; text-align:center;">
                    <div style="font-size:10px; color:#6B6B6B; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:12px;">Your photos and videos</div>
                    <div style="font-size:20px; font-weight:500; color:#1A1A1A; line-height:1.35; margin-bottom:14px;">Your media lives here</div>
                    <div style="font-size:14px; color:#4A4A4A; line-height:1.65; margin-bottom:22px;">We are editing your photos and videos right now. Everything will be uploaded to your private Google Drive folder within the next <strong style="font-weight:500; color:#1A1A1A;">24 hours</strong>.</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" bgcolor="#D85A30" style="border-radius:8px; background:#D85A30;"><a href="{{driveFolderUrl}}" target="_blank" class="cta-btn" style="display:inline-block; padding:14px 32px; font-family:'Trebuchet MS','Helvetica Neue',Arial,sans-serif; font-size:14px; color:#FFFFFF; text-decoration:none; font-weight:500; letter-spacing:0.03em; border-radius:8px;">Open your media folder &rarr;</a></td></tr></table>
                    <div style="font-size:11px; color:#6B6B6B; margin-top:14px; line-height:1.6;">Save the link. The folder stays live for 30 days.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:22px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="stack" width="50%" valign="top" style="padding-right:12px;"><div style="font-size:11px; color:#6B6B6B; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:6px;">In the folder</div><div style="font-size:13px; color:#1A1A1A; line-height:1.7;">Action shots from the line &middot; group photos on the deck &middot; a short highlight video</div></td>
                  <td class="stack" width="50%" valign="top" style="padding-left:12px;"><div style="font-size:11px; color:#6B6B6B; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:6px;">Yours to keep</div><div style="font-size:13px; color:#1A1A1A; line-height:1.7;">Download, share, print, post. The files are all yours.</div></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="px" style="padding:32px 36px 0;"><div style="height:1px; background:rgba(0,0,0,0.1);">&nbsp;</div></td></tr>
          <tr>
            <td class="px" style="padding:28px 36px 0; text-align:center;">
              <div style="font-size:11px; color:#D85A30; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:12px; font-weight:500;">One small favour</div>
              <div style="font-size:22px; font-weight:500; color:#1A1A1A; line-height:1.35; letter-spacing:-0.01em; margin-bottom:14px;">Your review means a lot to us</div>
              <div style="font-size:14px; color:#4A4A4A; line-height:1.7; margin-bottom:22px;">We are a small team on a small island, and we have set out to build the world's most beautiful zipline. If we lived up to that today, a short Google review helps other travellers find us.</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" bgcolor="#FFFFFF" style="border-radius:8px; border:2px solid #D85A30;"><a href="https://g.page/r/CV9csPtCAH5qEBM/review" target="_blank" class="cta-btn" style="display:inline-block; padding:12px 28px; font-family:'Trebuchet MS','Helvetica Neue',Arial,sans-serif; font-size:14px; color:#D85A30; text-decoration:none; font-weight:500; letter-spacing:0.03em; border-radius:8px;">&#9733; &nbsp;Leave a Google review</a></td></tr></table>
              <div style="font-size:11px; color:#9A9A9A; margin-top:14px; line-height:1.6;">Opens Google. No account creation needed.</div>
            </td>
          </tr>
          <tr><td class="px" style="padding:32px 36px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAEEDA; border-radius:12px;"><tr><td style="padding:20px 24px;"><div style="font-size:13px; color:#854F0B; line-height:1.7;"><strong style="font-weight:500;">Share your ride?</strong> Tag <a href="https://instagram.com/ziplinemaldives" style="color:#854F0B; text-decoration:underline; font-weight:500;">@ziplinemaldives</a> on Instagram. We love reposting guest footage.</div></td></tr></table></td></tr>
          <tr><td class="px" style="padding:30px 36px 0; text-align:center;"><div style="font-size:14px; color:#1A1A1A; line-height:1.7;">Until next time,</div><div style="font-size:14px; color:#1A1A1A; line-height:1.7; margin-top:4px;"><strong style="font-weight:500;">The Zipline Maldives team</strong></div><div style="font-size:12px; color:#6B6B6B; margin-top:4px;">Vahmaafushi &middot; K. Atoll</div></td></tr>
          <tr>
            <td class="px" style="padding:32px 36px 30px;">
              <div style="height:1px; background:rgba(0,0,0,0.08); margin-bottom:18px;">&nbsp;</div>
              <div style="font-size:11px; color:#6B6B6B; line-height:1.7; text-align:center;">Questions about your media? Reply to this email or write to <a href="mailto:hello@zipline.mv" style="color:#6B6B6B; text-decoration:underline;">hello@zipline.mv</a><br><a href="https://zipline.mv" style="color:#6B6B6B; text-decoration:underline;">zipline.mv</a> &nbsp;&middot;&nbsp; <a href="https://instagram.com/ziplinemaldives" style="color:#6B6B6B; text-decoration:underline;">Instagram</a> &nbsp;&middot;&nbsp; <a href="https://vahmaafushi.com" style="color:#6B6B6B; text-decoration:underline;">Vahmaafushi.com</a></div>
              <div style="font-size:10px; color:#9A9A9A; line-height:1.6; text-align:center; margin-top:16px;">Zipline Maldives, Vahmaafushi, K. Atoll, Republic of Maldives</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const MEDIA_EMAIL_PLACEHOLDERS = [
  "{{firstName}}",
  "{{customerName}}",
  "{{bookingReference}}",
  "{{driveFolderUrl}}",
];
