import Stripe from 'stripe';
import { Arg, Ctx, Field, ObjectType, Query, Resolver } from 'type-graphql';

import { Repository } from 'typeorm';

import { InjectRepository } from 'typeorm-typedi-extensions';

import config from '../config';
import { BankAccount, StripeTransaction } from '../entities/bankAccount';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import { MyContext } from '../types/MyContext';
import { generatePDFDocument } from '../utils/documents';
import {
  createStripeAccountLink,
  createStripeCheckoutSession,
  getStripeAccountId,
  getStripeCheckoutSession,
  getStripeCustomer,
} from '../utils/stripe';

@ObjectType()
class StripeDonationSession {
  @Field()
  sessionId: string;

  @Field()
  accountId: string;
}

@ObjectType()
class StripeDonationInfo {
  @Field(() => [StripeTransaction])
  donations: StripeTransaction[];

  @Field()
  totalDonors: number;
}

@ObjectType()
class StripeDonationPDFData {
  @Field()
  id: string;
  @Field()
  createdAt: string;
  @Field()
  donor: string;
  @Field()
  projectName: string;
  @Field()
  status: string;
  @Field()
  amount: number;
  @Field()
  currency: string;

  @Field()
  donorName: string;
  @Field()
  donorEmail: string;

  @Field()
  projectDonation: number;
  @Field()
  givethDonation: number;
  @Field()
  processingFee: number;
}

@ObjectType()
class StripeDonationPDF {
  @Field()
  pdf: string;

  @Field(() => StripeDonationPDFData)
  data: StripeDonationPDFData;
}

@Resolver(of => BankAccount)
export class BankAccountResolver {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(StripeTransaction)
    private readonly stripeTransactionRepository: Repository<StripeTransaction>,
  ) {}

  @Query(returns => String)
  async setProjectBankAccount(
    @Arg('projectId') projectId: number,
    @Arg('returnUrl') returnUrl: string,
    @Arg('refreshUrl') refreshUrl: string,
    @Ctx() { req }: MyContext,
  ): Promise<String> {
    // const user = req.user && await this.userRepository.findOne({ id: req.user.userId });
    const project = await this.projectRepository.findOne({ id: projectId });

    // if (!user) throw new Error('Access denied')
    if (!project) throw new Error('Project not found');

    const accountId = await getStripeAccountId(project);
    const response = await createStripeAccountLink(
      accountId,
      returnUrl,
      refreshUrl,
    );

    return response.url;
  }

  @Query(returns => StripeDonationSession)
  async getStripeProjectDonationSession(
    @Arg('projectId') projectId: number,
    @Arg('amount') amount: number,
    @Arg('donateToGiveth') donateToGiveth: boolean,
    @Arg('anonymous') anonymous: boolean,
    @Arg('cancelUrl') cancelUrl: string,
    @Arg('successUrl') successUrl: string,
  ) {
    const project = await this.projectRepository.findOne({ id: projectId });

    if (!project) throw new Error('Project not found');
    if (!project.stripeAccountId)
      throw new Error(
        'This project does not accept bank account donations right now.',
      );

    amount = Math.floor(amount * 100);

    const transaction = await this.stripeTransactionRepository
      .create({
        amount: amount / 100,
        createdAt: new Date(),
        anonymous,
        currency: 'USD',
        projectId,
        status: 'pending',
        donateToGiveth,
      })
      .save();

    const checkout = await createStripeCheckoutSession(project, {
      amount,
      successUrl: successUrl + '&sessionId=' + transaction.id,
      cancelUrl: cancelUrl + '&sessionId=' + transaction.id,
      applicationFee: donateToGiveth
        ? Number(config.get('STRIPE_APPLICATION_FEE')) * 100
        : 0,
    });

    transaction.sessionId = checkout.id;

    await StripeTransaction.save(transaction);

    return { sessionId: checkout.id, accountId: project.stripeAccountId };
  }

  @Query(returns => StripeDonationInfo)
  async getStripeProjectDonations(@Arg('projectId') projectId: number) {
    const project = await this.projectRepository.findOne({ id: projectId });

    if (!project) throw new Error('Project not found');
    if (!project.stripeAccountId)
      throw new Error(
        'This project does not accept bank account donations right now.',
      );

    return {
      donations: await (
        await this.stripeTransactionRepository.find({ projectId })
      ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      totalDonors: 0,
    };
  }

  @Query(returns => StripeDonationPDF)
  async getStripeDonationPDF(@Arg('sessionId') sessionId: number) {
    const session = await StripeTransaction.findOne({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const project = await this.projectRepository.findOne({
      id: session.projectId,
    });
    if (!project) throw new Error('Project not found');

    if (session.status !== 'paid')
      throw new Error(
        'Invoice is not available because the payment status is:' +
          session.status,
      );
    if (!session.donorCustomerId)
      throw new Error(
        'The invoice could not be generated because the donor was not found in the transaction',
      );

    const customer = (await getStripeCustomer(
      project.stripeAccountId || '',
      session.donorCustomerId,
    )) as Stripe.Customer;

    const givethDonation = session.donateToGiveth ? 5 : 0;
    const processingFee = session.amount * 0.029 + 0.3;

    const pdfData: StripeDonationPDFData = {
      id: session.id.toString(),
      createdAt: session.createdAt.toString(),
      donor: session.anonymous ? 'Anonymous' : customer.name || '',
      projectName: project.title,
      status: session.status,
      amount: session.amount,
      currency: session.currency,

      donorName: session.donorName,
      donorEmail: session.donorEmail,

      projectDonation:
        session.amount - givethDonation - (0.3 + 0.029 * session.amount),
      givethDonation,
      processingFee,
    };
    const pdf = await generatePDFDocument('stripe-checkout', pdfData);

    return { pdf, data: pdfData };
  }
}
