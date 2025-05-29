import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { In } from 'typeorm';
import { Cause, CauseStatus, ListingStatus } from '../entities/cause';
import { User } from '../entities/user';
import { ApolloContext } from '../types/ApolloContext';
import { UserRole } from '../entities/user';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { Project } from '../entities/project';

@Resolver()
export class CauseResolver {
  @Authorized([UserRole.ADMIN, UserRole.OPERATOR])
  @Mutation(() => Cause)
  async createCause(
    @Ctx() { req: { user: _user } }: ApolloContext,
    @Arg('title') title: string,
    @Arg('description') description: string,
    @Arg('chainId') chainId: number,
    @Arg('ownerId') ownerId: number,
    @Arg('projectIds', () => [Number]) projectIds: number[],
    @Arg('mainCategory') mainCategory: string,
    @Arg('subCategories', () => [String]) subCategories: string[],
    @Arg('depositTxHash', { nullable: true }) depositTxHash?: string,
    @Arg('bannerImage', { nullable: true }) _bannerImage?: string,
  ): Promise<Cause> {
    // Validate required fields
    if (
      !title?.trim() ||
      !description?.trim() ||
      !chainId ||
      !ownerId ||
      !mainCategory?.trim()
    ) {
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_INPUT));
    }

    // Validate chainId is a number
    if (typeof chainId !== 'number' || isNaN(chainId)) {
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_CHAIN_ID));
    }

    // Validate project IDs
    if (!projectIds || projectIds.length < 5 || projectIds.length > 50) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_COUNT),
      );
    }

    // Find owner
    const owner = await User.findOne({ where: { id: ownerId } });
    if (!owner) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }

    // Find and validate projects
    const projects = await Project.findByIds(projectIds);
    if (projects.length !== projectIds.length) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_IDS),
      );
    }

    // Verify deposit transaction if provided
    if (depositTxHash) {
      // TODO: Implement deposit transaction verification
      // This should verify the transaction exists and is valid
      // For now, we'll just check if it's a non-empty string
      if (!depositTxHash.trim()) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
      }
    }

    // Generate unique causeId
    const causeId = `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create funding pool address (this should be replaced with actual implementation)
    const fundingPoolAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

    const cause = Cause.create({
      title: title.trim(),
      description: description.trim(),
      chainId,
      fundingPoolAddress,
      causeId,
      mainCategory: mainCategory.trim(),
      subCategories: subCategories.map(cat => cat.trim()),
      owner,
      ownerId: owner.id,
      status: CauseStatus.PENDING,
      listingStatus: ListingStatus.NotReviewed,
      totalRaised: 0,
      totalDistributed: 0,
      totalDonated: 0,
      activeProjectsCount: projects.length,
      projects,
    });

    await cause.save();

    // Update user's ownedCausesCount
    await User.update(
      { id: owner.id },
      { ownedCausesCount: () => '"ownedCausesCount" + 1' },
    );

    // Update projects' activeCausesCount
    await Project.update(
      { id: In(projectIds) },
      { activeCausesCount: () => '"activeCausesCount" + 1' },
    );

    return cause;
  }
}
