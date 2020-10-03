import Stripe from "stripe";
import { Repository } from 'typeorm';
import Config from '../config';
import { BankAccount } from '../entities/bankAccount';
import { Project } from '../entities/project';
import { User } from '../entities/user';

const config = new Config(process.env);
const stripe = new Stripe(config.STRIPE_SECRET, { apiVersion: "2020-08-27" });

interface CreateStripeCheckoutSessionOptions {
    amount: number
    successUrl: string
    cancelUrl: string
    applicationFee?: number
}

export async function getStripeAccountId (project: Project) {
    if(project.stripeAccountId) return project.stripeAccountId;

    const customer = await createStripeAccount(project);
    
    return customer.id;
}

export async function createStripeAccount (project: Project) {
    const account = await (<any>stripe).accounts.create({ type: "standard" });

    project.stripeAccountId = account.id;

    await Project.save(project);

    return account;
}

export function createStripeAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    return stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: refreshUrl,
        return_url: refreshUrl
    })
}

export async function createStripeCheckoutSession (project: Project, options: CreateStripeCheckoutSessionOptions) {
    const accountId = await getStripeAccountId(project);
    const fee = options.applicationFee? { payment_intent_data: { application_fee_amount: options.applicationFee } } : {}
    return await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
            name: `${project.title} donation: ($${options.amount/100})`,
            amount: options.amount,
            currency: 'USD',
            quantity: 1
        }],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        ...fee,
    }, {
        stripeAccount: project.stripeAccountId
    })
}