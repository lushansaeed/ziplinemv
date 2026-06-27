/**
 * WhatsApp notification via Meta Business API (Cloud API).
 * Requires a verified WhatsApp Business Account and approved message templates.
 *
 * To activate:
 * 1. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID in .env
 * 2. Create message templates in Meta Business Suite
 * 3. Replace template names below with your approved templates
 */

const BASE_URL = "https://graph.facebook.com/v19.0";

interface WhatsAppTextMessage {
  to:   string;
  body: string;
}

interface WhatsAppTemplateMessage {
  to:           string;
  templateName: string;
  language:     string;
  components?:  any[];
}

async function sendWhatsAppMessage(payload: object): Promise<boolean> {
  const phoneNumberId   = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken     = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("[WhatsApp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set");
    return false;
  }

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[WhatsApp] Error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[WhatsApp] Network error:", err);
    return false;
  }
}

/**
 * Send booking confirmation via WhatsApp template.
 * Template must be pre-approved by Meta with variables:
 *   {{1}} = customer name
 *   {{2}} = booking reference
 *   {{3}} = date
 *   {{4}} = time
 */
export async function sendBookingConfirmationWhatsApp(
  phone: string,
  customerName: string,
  reference: string,
  date: string,
  time: string
): Promise<boolean> {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to:                phone.replace(/\D/g, ""), // digits only
    type:              "template",
    template: {
      name:     "booking_confirmation",           // replace with your template name
      language: { code: "en" },
      components: [
        {
          type:       "body",
          parameters: [
            { type: "text", text: customerName },
            { type: "text", text: reference },
            { type: "text", text: date },
            { type: "text", text: time },
          ],
        },
      ],
    },
  });
}

/**
 * Send waiver reminder via WhatsApp.
 */
export async function sendWaiverReminderWhatsApp(
  phone:     string,
  name:      string,
  reference: string,
  bookingUrl:string
): Promise<boolean> {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to:                phone.replace(/\D/g, ""),
    type:              "template",
    template: {
      name:     "waiver_reminder",
      language: { code: "en" },
      components: [
        {
          type:       "body",
          parameters: [
            { type: "text", text: name },
            { type: "text", text: reference },
          ],
        },
        {
          type:   "button",
          sub_type: "url",
          index:  "0",
          parameters: [{ type: "text", text: bookingUrl }],
        },
      ],
    },
  });
}

export async function sendBookingWaiverLinkWhatsApp({
  phone,
  reference,
  rideDate,
  rideTime,
  numberOfRiders,
  waiverUrl,
}: {
  phone: string;
  reference: string;
  rideDate: string;
  rideTime: string;
  numberOfRiders: number;
  waiverUrl: string;
}): Promise<boolean> {
  return sendWhatsAppText({
    to: phone,
    body: `Hi,

Your zipline booking has been confirmed.

Please ask each rider to complete the waiver form using the link below before your ride:

${waiverUrl}

You can also scan the QR code available on your booking confirmation page to open the waiver form.

Booking Reference: ${reference}
Ride Date: ${rideDate}
Ride Time: ${rideTime}
Number of Riders: ${numberOfRiders}

Thank you,
Zipline Maldives Team`,
  });
}

/**
 * Send a freeform text message (only to users who have opted in / messaged first).
 * Use for support replies, not outbound marketing.
 */
export async function sendWhatsAppText({ to, body }: WhatsAppTextMessage): Promise<boolean> {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to:                to.replace(/\D/g, ""),
    type:              "text",
    text:              { preview_url: false, body },
  });
}
