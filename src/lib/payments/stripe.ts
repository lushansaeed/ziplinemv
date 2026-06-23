import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export async function createPaymentIntent(
  bookingId: string,
  amount: number,
  currency = "usd",
  metadata: Record<string, string> = {}
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount:   Math.round(amount * 100), // Stripe uses cents
    currency,
    metadata: {
      bookingId,
      ...metadata,
    },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret:    paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

export async function createPaymentLink(
  bookingId: string,
  amount: number,
  currency = "usd",
  customerEmail?: string,
  description?: string
): Promise<string> {
  const price = await stripe.prices.create({
    unit_amount: Math.round(amount * 100),
    currency,
    product_data: {
      name: description ?? "Zipline Maldives Experience",
      metadata: { bookingId },
    },
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: {
      type:     "redirect",
      redirect: { url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/confirmation?ref=${bookingId}&payment=success` },
    },
    metadata:          { bookingId },
    ...(customerEmail ? { customer_creation: "always" } : {}),
  });

  return link.url;
}

export async function constructWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
