import Stripe from 'stripe';

import config from '../config';
import { StripeTransaction } from '../entities/bankAccount';
import { logger } from './logger';

const stripe = new Stripe(config.get('STRIPE_SECRET').toString(), {
  apiVersion: '2020-08-27',
});

export async function handleStripeWebhook(rq, rs) {
  const sig = rq.headers['stripe-signature'];
  let event;

  // Verify webhook signature and extract the event.
  // See https://stripe.com/docs/webhooks/signatures for more information.
  try {
    event = stripe.webhooks.constructEvent(
      rq.body,
      sig,
      config.get('STRIPE_WEBHOOK_SECRET').toString(),
    );
  } catch (err) {
    logger.error('Webhook Error:', err);
    return rs.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const connectedAccountId = event.account;
    const customer = (await getStripeCustomer(
      connectedAccountId,
      session.customer,
    )) as Stripe.Customer;
    logger.debug(session);

    await StripeTransaction.update(
      { sessionId: session.id },
      {
        status: session.payment_status,
        donorCustomerId: session.customer,
        donorEmail: customer.email || '',
        donorName: customer.name || '',
      },
    );
  }

  rs.json({ received: true });
}

export async function getStripeCustomer(accountId: string, customerId: string) {
  return await stripe.customers.retrieve(customerId, {
    stripeAccount: accountId,
  });
}
