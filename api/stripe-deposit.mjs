// Stripe webhook: when a booking deposit is paid through one of the website's
// payment links, email the client an invoice for the remaining 50% balance.
import crypto from 'node:crypto';

const SERVICES = {
  session: { name: 'On-Site Content Session', when: 'shoot' },
  sessionplus: { name: 'Ready-to-Post Content Session', when: 'shoot' },
  photoshoot: { name: 'Brand Photoshoot', when: 'shoot' },
  event: { name: 'Event Coverage', when: 'event' },
};
const DAYS_UNTIL_DUE = '3';
const TOLERANCE_SECONDS = 300;

async function stripe(path, params, idempotencyKey) {
  const headers = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };
  if (params) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST' : 'GET',
    headers,
    body: params ? new URLSearchParams(params) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${json.error?.message || res.status}`);
  return json;
}

export function verifySignature(raw, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  let timestamp;
  const signatures = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = Number(v);
    if (k === 'v1') signatures.push(v);
  }
  if (!timestamp || Math.abs(now - timestamp) > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  return signatures.some((sig) => sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export async function POST(request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get('stripe-signature'), process.env.STRIPE_DEPOSIT_WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(raw);
  const session = event.data?.object || {};
  const service = SERVICES[session.metadata?.service];
  if (event.type !== 'checkout.session.completed' || !service ||
      session.mode !== 'payment' || session.payment_status !== 'paid') {
    return Response.json({ ignored: true });
  }

  const details = session.customer_details || {};
  if (!details.email) return Response.json({ ignored: true, reason: 'no email' });

  try {
    // Deposits are 50%, so the balance equals what was just paid.
    const balance = String(session.amount_total);
    const key = (step) => `deposit-balance-${step}-${session.id}`;

    // Never bill the same deposit twice (retries, manual resends).
    const query = `metadata['deposit_checkout_session']:'${session.id}'`;
    const already = await stripe(`invoices/search?${new URLSearchParams({ query })}`);
    if (already.data.length) return Response.json({ alreadyInvoiced: already.data[0].id });

    let customer = session.customer;
    if (!customer) {
      const existing = await stripe(`customers?${new URLSearchParams({ email: details.email, limit: '1' })}`);
      customer = existing.data[0]?.id || (await stripe('customers', {
        email: details.email,
        ...(details.name && { name: details.name }),
        ...(details.phone && { phone: details.phone }),
      }, key('customer'))).id;
    }

    const invoice = await stripe('invoices', {
      customer,
      collection_method: 'send_invoice',
      days_until_due: DAYS_UNTIL_DUE,
      auto_advance: 'false',
      description: `Thanks for booking your ${service.name}! This covers the remaining 50% balance, due before your ${service.when}. — Diana`,
      'metadata[service]': session.metadata.service,
      'metadata[deposit_checkout_session]': session.id,
    }, key('invoice'));
    await stripe('invoiceitems', {
      customer,
      invoice: invoice.id,
      amount: balance,
      currency: session.currency,
      description: `${service.name}: remaining balance`,
    }, key('item'));
    await stripe(`invoices/${invoice.id}/finalize`, {}, key('finalize'));
    await stripe(`invoices/${invoice.id}/send`, {}, key('send'));

    return Response.json({ invoiced: invoice.id });
  } catch (err) {
    console.error('Balance invoice failed', session.id, err);
    return new Response('Balance invoice failed', { status: 500 }); // Stripe retries
  }
}
