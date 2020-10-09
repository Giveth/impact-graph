import { Max, Min } from 'class-validator';
import { Arg, Args, ArgsType, Ctx, Field, InputType, Int, Mutation, ObjectType, PubSub, PubSubEngine, Query, Resolver } from "type-graphql";
import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';
import Config from '../config';
import { Context } from '../Context';
import { BankAccount, StripeTransaction } from '../entities/bankAccount';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import { MyContext } from '../types/MyContext';
import { createStripeAccountLink, createStripeCheckoutSession, getStripeAccountId } from "../utils/stripe";
import { generatePDFDocument } from "../utils/documents";

const config = new Config(process.env);

@ObjectType()
class StripeDonationSession {
    @Field()
    sessionId: string;

    @Field()
    accountId: string;
}

@Resolver(of => BankAccount)
export class BankAccountResolver {
    constructor (
        @InjectRepository(BankAccount)       private readonly bankAccountRepository: Repository<BankAccount>,
        @InjectRepository(Project)           private readonly projectRepository: Repository<Project>,
        @InjectRepository(User)              private readonly userRepository: Repository<User>,
        @InjectRepository(StripeTransaction) private readonly stripeTransactionRepository: Repository<StripeTransaction>
    ) {}

    @Query(returns => String)
    async setProjectBankAccount (
        @Arg('projectId') projectId: number,
        @Arg("returnUrl") returnUrl: string,
        @Arg('refreshUrl') refreshUrl: string,
        @Ctx() { req }: MyContext
    ): Promise<String> {
        // const user = req.user && await this.userRepository.findOne({ id: req.user.userId });
        const project = await this.projectRepository.findOne({ id: projectId });

        // if (!user) throw new Error('Access denied')
        if (!project) throw new Error("Project not found");

        const accountId = await getStripeAccountId(project);
        const response = await createStripeAccountLink(accountId, returnUrl, refreshUrl);

        return response.url;
    }

    @Query(returns => StripeDonationSession)
    async getStripeProjectDonationSession (
        @Arg('projectId') projectId: number,
        @Arg('amount') amount: number,
        @Arg('donateToGiveth') donateToGiveth: boolean,
        @Arg('anonymous') anonymous: boolean,
        @Arg("cancelUrl") cancelUrl: string,
        @Arg('successUrl') successUrl: string,
    ) {
        const project = await this.projectRepository.findOne({ id: projectId });
        
        if (!project) throw new Error("Project not found");
        if (!project.stripeAccountId) throw new Error("This project does not accept bank account donations right now.");

        amount = amount * 100;

        const transaction = await this.stripeTransactionRepository.create({
            amount: amount,
            createdAt: new Date(),
            donor: anonymous? "Anonymous" : "Not Anonymous",
            currency: "USD",
            projectId,
            status: 'pending'
        }).save();

        const checkout = await createStripeCheckoutSession(project, {
            amount,
            successUrl: successUrl + "&sessionId=" + transaction.id,
            cancelUrl: cancelUrl + "&sessionId=" + transaction.id,
            applicationFee: donateToGiveth? config.STRIPE_APPLICATION_FEE * 100 : 0
        });

        transaction.sessionId = checkout.id;

        await StripeTransaction.save(transaction)

        return { sessionId: checkout.id, accountId: project.stripeAccountId };
    }

    @Query(returns => [StripeTransaction])
    async getStripeProjectDonations (
        @Arg('projectId') projectId: number
    ) {
        const project = await this.projectRepository.findOne({ id: projectId });
        
        if (!project) throw new Error("Project not found");
        if (!project.stripeAccountId) throw new Error("This project does not accept bank account donations right now.");

        return await (await this.stripeTransactionRepository.find({ projectId })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }

    @Query(returns => String)
    async getStripeDonationPDF (
        @Arg('sessionId') sessionId: number
    ) {
        const session = await StripeTransaction.findOne({ id: sessionId })
        if (!session) throw new Error("Session not found");

        const project = await this.projectRepository.findOne({ id: session.projectId });
        if (!project) throw new Error("Project not found");

        return await generatePDFDocument("stripe-checkout", {
            id: session.id,
            createdAt: session.createdAt,
            donor: session.donor,
            projectName: project.title,
            status: session.status,
            amount: session.amount,
            currency: session.currency
        })
    }

}