import Stripe from 'stripe';

import config from '../config';
import { StripeTransaction } from '../entities/bankAccount';
import { Project } from '../entities/project';
import { logger } from './logger';

const stripe = new Stripe(config.get('STRIPE_SECRET').toString(), {
  apiVersion: '2020-08-27',
});

interface CreateStripeCheckoutSessionOptions {
  amount: number;
  successUrl: string;
  cancelUrl: string;
  applicationFee?: number;
}

export async function getStripeAccountId(project: Project) {
  if (project.stripeAccountId) return project.stripeAccountId;

  const customer = await createStripeAccount(project);

  return customer.id;
}

export async function createStripeAccount(project: Project) {
  const account = await (stripe as any).accounts.create({ type: 'standard' });

  project.stripeAccountId = account.id;

  await Project.save(project);

  return account;
}

export function createStripeAccountLink(accountId: string, refreshUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: refreshUrl,
    return_url: refreshUrl,
  });
}

export async function createStripeCheckoutSession(
  project: Project,
  options: CreateStripeCheckoutSessionOptions,
) {
  const fee = options.applicationFee
    ? {
        payment_intent_data: { application_fee_amount: options.applicationFee },
      }
    : {};
  return await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: [
        {
          name: `${project.title} donation: ($${options.amount / 100})`,
          amount: options.amount,
          currency: 'USD',
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      ...fee,
    },
    {
      stripeAccount: project.stripeAccountId || undefined,
    },
  );
}

export async function getStripeCheckoutSession(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId);
}

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
