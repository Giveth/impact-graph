import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostRefactoring1600000000000 implements MigrationInterface {
  name = 'PostRefactoring1600000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reaction" ("id" SERIAL NOT NULL, "projectUpdateId" integer, "userId" integer NOT NULL, "reaction" character varying NOT NULL, "projectId" integer, CONSTRAINT "PK_41fbb346da22da4df129f14b11e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa21ddc1cacde7564819e93ce7" ON "reaction" ("projectUpdateId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7ad7dffa79f1cfbfa08fe4255" ON "reaction" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a5fb4f3133d8fcbbf848c6b7e4" ON "reaction" ("userId", "projectUpdateId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d63fe644dfb18b2fd1c114551f" ON "reaction" ("userId", "projectId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "account_verification" ("id" SERIAL NOT NULL, "platform" character varying NOT NULL, "dId" character varying NOT NULL, "protocol" character varying NOT NULL, "claim" character varying NOT NULL, "attestation" character varying NOT NULL, "userId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_10d9b71b18416f4588df39bf46c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a5dcfc24e8efb92d898d0dd87" ON "account_verification" ("dId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d4eff3e8d902988754fde5be0" ON "account_verification" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_status_reason" ("id" SERIAL NOT NULL, "description" character varying, "statusId" integer, CONSTRAINT "PK_453e771767c65a08619aff4ba53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_status" ("id" SERIAL NOT NULL, "symbol" text NOT NULL, "name" character varying, "description" character varying, CONSTRAINT "UQ_0742348e857789fde8cda81a2ce" UNIQUE ("symbol"), CONSTRAINT "PK_625ed5469429a6b32e34ba9f827" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d0a4ed696b85b68a07da85ee8" ON "project_status" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_status_history" ("id" SERIAL NOT NULL, "projectId" integer, "statusId" integer, "prevStatusId" integer, "reasonId" integer, "userId" integer, "description" character varying, "createdAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_97d27898a32d73f93930dd394d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "social_profile" ("id" SERIAL NOT NULL, "projectId" integer, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "socialNetworkId" text, "name" text, "link" text, "socialNetwork" text, "isVerified" boolean NOT NULL DEFAULT false, "userId" integer, "projectVerificationFormId" integer, CONSTRAINT "PK_50727a3d0f93a9069ddbe8e6d97" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e3aacd2770c260dd996426906" ON "social_profile" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36df0f180f71bc7847251cdaec" ON "social_profile" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff8019d5876408cc79c11742dd" ON "social_profile" ("projectVerificationFormId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0239381aa055d6ef47fafba6cd" ON "social_profile" ("socialNetworkId", "socialNetwork") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_verification_form_status_enum" AS ENUM('verified', 'draft', 'submitted', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_verification_form" ("id" SERIAL NOT NULL, "projectId" integer, "reviewerId" integer, "userId" integer, "status" "public"."project_verification_form_status_enum" NOT NULL DEFAULT 'draft', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "verifiedAt" TIMESTAMP, "personalInfo" jsonb, "projectRegistry" jsonb, "projectContacts" jsonb, "milestones" jsonb, "managingFunds" jsonb, "commentsSection" jsonb, "lastStep" text, "emailConfirmed" boolean NOT NULL DEFAULT false, "email" text, "emailConfirmationToken" text, "emailConfirmationTokenExpiredAt" TIMESTAMP WITH TIME ZONE, "emailConfirmationSent" boolean NOT NULL DEFAULT false, "emailConfirmationSentAt" TIMESTAMP WITH TIME ZONE, "emailConfirmedAt" TIMESTAMP, "isTermAndConditionsAccepted" boolean DEFAULT false, CONSTRAINT "REL_5b7605d4e1a7832bca9911cffa" UNIQUE ("projectId"), CONSTRAINT "PK_542d1b04dd56527e69136e9d4ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5b7605d4e1a7832bca9911cffa" ON "project_verification_form" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_095f2561cc6eab0595b871d54b" ON "project_verification_form" ("reviewerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f0287461e083d8d2f5bf6c6e7" ON "project_verification_form" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "referred_event" ("id" SERIAL NOT NULL, "startTime" TIMESTAMP, "referrerId" character varying, "isDonorLinkedToReferrer" boolean NOT NULL DEFAULT false, "isDonorClickEventSent" boolean NOT NULL DEFAULT false, "userId" integer, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_00817a5ab10223c2a735d7d2a5" UNIQUE ("userId"), CONSTRAINT "PK_c95e0e8ea6a68101718ccf90a88" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('restricted', 'admin', 'operator', 'reviewer', 'campaignManager', 'qfManager')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'restricted', "email" character varying, "firstName" character varying, "lastName" character varying, "name" character varying, "walletAddress" character varying, "streamBalanceWarning" json, "password" character varying, "encryptedPassword" character varying, "avatar" character varying, "url" character varying, "passportScore" real, "passportStamps" integer, "location" character varying, "loginType" character varying NOT NULL, "dId" character varying, "confirmed" boolean NOT NULL DEFAULT false, "chainvineId" character varying, "wasReferred" boolean NOT NULL DEFAULT false, "isReferrer" boolean NOT NULL DEFAULT false, "segmentIdentified" boolean NOT NULL DEFAULT false, "totalDonated" real DEFAULT '0', "totalReceived" real DEFAULT '0', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_efbd1135797e451d834bcf88cd2" UNIQUE ("walletAddress"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "qf_round" ("id" SERIAL NOT NULL, "name" text, "title" text, "description" text, "slug" text NOT NULL, "isActive" boolean, "allocatedFund" integer NOT NULL, "allocatedFundUSD" integer, "allocatedFundUSDPreferred" boolean, "allocatedTokenSymbol" character varying, "allocatedTokenChainId" integer, "maximumReward" real NOT NULL DEFAULT '0.2', "minimumPassportScore" real NOT NULL, "minMBDScore" double precision, "minimumValidUsdValue" real NOT NULL DEFAULT '1', "eligibleNetworks" integer array NOT NULL DEFAULT '{}', "beginDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "bannerBgImage" text, "sponsorsImgs" text array NOT NULL DEFAULT '{}', "isDataAnalysisDone" boolean NOT NULL DEFAULT false, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f9eeb77e6f2b60a74390dbee57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b04a22720bff08d527a67a63e8" ON "qf_round" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."donation_chaintype_enum" AS ENUM('EVM', 'SOLANA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "donation" ("id" SERIAL NOT NULL, "transactionId" character varying, "nonce" integer, "transactionNetworkId" integer NOT NULL, "safeTransactionId" character varying, "chainType" "public"."donation_chaintype_enum" NOT NULL DEFAULT 'EVM', "isProjectVerified" boolean NOT NULL DEFAULT false, "status" text NOT NULL DEFAULT 'pending', "isExternal" boolean NOT NULL DEFAULT false, "blockNumber" integer, "origin" text, "verifyErrorMessage" text, "speedup" boolean NOT NULL DEFAULT false, "isCustomToken" boolean NOT NULL DEFAULT false, "isFiat" boolean NOT NULL DEFAULT false, "toWalletAddress" character varying NOT NULL, "fromWalletAddress" character varying NOT NULL, "tokenAddress" character varying, "currency" character varying NOT NULL, "anonymous" boolean, "amount" real NOT NULL, "valueEth" real, "valueUsd" real, "priceEth" real, "priceUsd" real, "projectId" integer, "qfRoundId" integer, "distributedFundQfRoundId" integer, "userId" integer, "contactEmail" text, "qfRoundUserScore" integer, "createdAt" TIMESTAMP NOT NULL, "importDate" TIMESTAMP, "donationType" character varying, "referrerWallet" character varying, "referralStartTimestamp" TIMESTAMP, "isReferrerGivbackEligible" boolean NOT NULL DEFAULT false, "transakStatus" character varying, "transakTransactionLink" character varying, "segmentNotified" boolean DEFAULT false, "isTokenEligibleForGivback" boolean DEFAULT false, "virtualPeriodStart" integer, "virtualPeriodEnd" integer, "useDonationBox" boolean DEFAULT false, "relevantDonationTxHash" character varying, "donationPercentage" numeric(5,2), CONSTRAINT "PK_25fb5a541964bc5cfc18fb13a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_284a4db7a442587ef3e3c44ff4" ON "donation" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9aebf8ccb9a644c6918cc7520b" ON "donation" ("qfRoundId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bfb9c5ce66e2d9a57dab8dafd5" ON "donation" ("distributedFundQfRoundId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_063499388657e648418470a439" ON "donation" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b80df3b6dd2e3ed70aef06f67f" ON "donation" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_qf_round_model_score" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "qfRoundId" integer NOT NULL, "score" real NOT NULL DEFAULT '0', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de73547be7032f7eb84bedd6111" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61b2af1a91b1633d9f4bf15b93" ON "user_qf_round_model_score" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f680c2a4a72294f3a60f8318b4" ON "user_qf_round_model_score" ("qfRoundId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sybil" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "qfRoundId" integer NOT NULL, "walletAddress" character varying NOT NULL, CONSTRAINT "UQ_6d498639538089df97f8d6a24b0" UNIQUE ("userId", "qfRoundId"), CONSTRAINT "PK_efcc655d47374c6bda84e29769f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_fraud" ("id" SERIAL NOT NULL, "projectId" integer NOT NULL, "qfRoundId" integer NOT NULL, CONSTRAINT "UQ_35fc936cefba3e1f32a0504fed6" UNIQUE ("projectId", "qfRoundId"), CONSTRAINT "PK_d466d7aed257c6636128b71724a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_address_chaintype_enum" AS ENUM('EVM', 'SOLANA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_address" ("id" SERIAL NOT NULL, "title" character varying, "networkId" integer NOT NULL, "chainType" "public"."project_address_chaintype_enum" NOT NULL DEFAULT 'EVM', "address" character varying NOT NULL, "projectId" integer, "userId" integer, "isRecipient" boolean NOT NULL DEFAULT false, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bb86e97b955f420437f2521b0a8" UNIQUE ("address", "networkId", "projectId"), CONSTRAINT "PK_671bb902fafec9019c5ceebd6ae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7d1cba3859f6b1d43777fc89f0" ON "project_address" ("title") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_680862dac01bd9840b69180f83" ON "project_address" ("address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0d07dea550d59fab79f008fc5" ON "project_address" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66f21783dcaa674d08ee8c80e4" ON "project_address" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "main_category" ("id" SERIAL NOT NULL, "title" text NOT NULL, "slug" text NOT NULL, "description" text, "banner" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_94a55911924728435f0a81a4dd2" UNIQUE ("title"), CONSTRAINT "UQ_2137db72ba8f8af87b1bd7255bb" UNIQUE ("slug"), CONSTRAINT "PK_1de960b48ce264cb705906a30d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "category" ("id" SERIAL NOT NULL, "name" text, "value" character varying, "source" character varying, "isActive" boolean NOT NULL DEFAULT true, "canUseOnFrontend" boolean NOT NULL DEFAULT true, "mainCategoryId" integer NOT NULL, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "featured_update" ("id" SERIAL NOT NULL, "projectId" integer, "projectUpdateId" integer, "position" integer, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_cadbd37858d0c5f9dbbfba97ab" UNIQUE ("projectId"), CONSTRAINT "REL_e564cf63cce5efdfb466042e82" UNIQUE ("projectUpdateId"), CONSTRAINT "PK_f5f993a9b0da69e92aa7bcdf5bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cadbd37858d0c5f9dbbfba97ab" ON "featured_update" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e564cf63cce5efdfb466042e82" ON "featured_update" ("projectUpdateId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."campaign_type_enum" AS ENUM('ManuallySelected', 'SortField', 'FilterFields', 'WithoutProjects')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."campaign_filterfields_enum" AS ENUM('verified', 'givingBlocksId', 'acceptFundOnGnosis', 'fromGivingBlock')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."campaign_sortingfield_enum" AS ENUM('MostFunded', 'MostLiked', 'Newest', 'Oldest', 'RecentlyUpdated', 'QualityScore')`,
    );
    await queryRunner.query(
      `CREATE TABLE "campaign" ("id" SERIAL NOT NULL, "slug" text NOT NULL, "title" text NOT NULL, "type" "public"."campaign_type_enum" NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "isNew" boolean NOT NULL DEFAULT false, "isFeatured" boolean NOT NULL DEFAULT false, "description" text NOT NULL, "hashtags" text array, "relatedProjectsSlugs" text array, "photo" character varying, "video" character varying, "videoPreview" character varying, "order" integer, "landingLink" character varying, "filterFields" "public"."campaign_filterfields_enum" array, "sortingField" "public"."campaign_sortingfield_enum", "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ee60fb10f0a4594d3ecb1b580f5" UNIQUE ("slug"), CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_social_media_type_enum" AS ENUM('FACEBOOK', 'X', 'INSTAGRAM', 'YOUTUBE', 'LINKEDIN', 'REDDIT', 'DISCORD', 'FARCASTER', 'LENS', 'WEBSITE', 'TELEGRAM', 'GITHUB')`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_social_media" ("id" SERIAL NOT NULL, "type" "public"."project_social_media_type_enum" NOT NULL, "link" character varying NOT NULL, "projectId" integer, "userId" integer, CONSTRAINT "PK_0256791e7a2b532c80edcd34836" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_59afc67000c5eace4b2ae4d921" ON "project_social_media" ("link") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e15675ee96198bf302c93e8c2" ON "project_social_media" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c1e8827613c2fea183836d92c" ON "project_social_media" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_reviewstatus_enum" AS ENUM('Not Reviewed', 'Listed', 'Not Listed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "project" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "slug" character varying, "slugHistory" text array NOT NULL DEFAULT '{}', "description" character varying, "descriptionSummary" character varying, "traceCampaignId" character varying, "givingBlocksId" character varying, "changeId" character varying, "website" character varying, "youtube" character varying, "creationDate" TIMESTAMP, "updatedAt" TIMESTAMP, "latestUpdateCreationDate" TIMESTAMP, "organizationId" integer, "coOrdinates" character varying, "image" character varying, "impactLocation" character varying, "balance" double precision, "stripeAccountId" character varying, "walletAddress" character varying, "verified" boolean NOT NULL, "verificationStatus" text, "isImported" boolean NOT NULL DEFAULT false, "giveBacks" boolean NOT NULL, "qualityScore" integer, "contacts" jsonb, "statusId" integer, "adminUserId" integer, "totalDonations" real NOT NULL, "totalTraceDonations" real NOT NULL DEFAULT '0', "totalReactions" integer NOT NULL DEFAULT '0', "totalProjectUpdates" integer, "sumDonationValueUsdForActiveQfRound" double precision, "countUniqueDonorsForActiveQfRound" integer, "countUniqueDonors" integer, "listed" boolean, "reviewStatus" "public"."project_reviewstatus_enum" NOT NULL DEFAULT 'Not Reviewed', CONSTRAINT "UQ_86cfc79126642910dd3104cdb29" UNIQUE ("walletAddress"), CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6fce32ddd71197807027be6ad3" ON "project" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b567170a13f26c67548fd9d159" ON "project" ("slugHistory") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4834506581f3c8eaddd003f770" ON "project" ("givingBlocksId") WHERE "givingBlocksId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_230ef230f8b5b301813465b3d5" ON "project" ("changeId") WHERE "changeId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b6d55aff9b16e061712260da68" ON "project" ("statusId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da2bed8094dd6e19f78c122d5b" ON "project" ("adminUserId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_update" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "projectId" integer NOT NULL, "userId" integer NOT NULL, "content" character varying NOT NULL, "contentSummary" character varying, "createdAt" TIMESTAMP NOT NULL, "isMain" boolean, "totalReactions" integer NOT NULL DEFAULT '0', "isNonProfitOrganization" boolean NOT NULL DEFAULT false, "organizationCountry" text, "organizationWebsite" text, "organizationDescription" text, "twitter" text, "facebook" text, "linkedin" text, "instagram" text, "youtube" text, "foundationDate" TIMESTAMP, "mission" text, "achievedMilestones" text, "managingFundDescription" text, CONSTRAINT "PK_b4f76307d68c3428aa2d555091f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."token_chaintype_enum" AS ENUM('EVM', 'SOLANA')`,
    );
    await queryRunner.query(
      `CREATE TABLE "token" ("id" SERIAL NOT NULL, "name" text NOT NULL, "symbol" text NOT NULL, "address" text NOT NULL, "mainnetAddress" text, "networkId" integer NOT NULL, "chainType" "public"."token_chaintype_enum" NOT NULL DEFAULT 'EVM', "decimals" integer NOT NULL, "order" integer, "isGivbackEligible" boolean NOT NULL DEFAULT false, "isStableCoin" boolean DEFAULT false, "coingeckoId" character varying, "cryptoCompareId" character varying, CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4e29282c925a82d9e50480c2af" ON "token" ("address", "networkId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organization" ("id" SERIAL NOT NULL, "name" text NOT NULL, "disableNotifications" boolean NOT NULL DEFAULT false, "disableUpdateEnforcement" boolean NOT NULL DEFAULT false, "label" text NOT NULL, "website" text, "supportCustomTokens" boolean DEFAULT false, CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallet" ("id" SERIAL NOT NULL, "address" text NOT NULL, "userId" integer NOT NULL, CONSTRAINT "UQ_1dcc9f5fd49e3dc52c6d2393c53" UNIQUE ("address"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_image" ("id" SERIAL NOT NULL, "projectId" integer, "url" character varying, CONSTRAINT "PK_09b0ab9ec6330049e8a59289e32" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "bank_account" ("id" SERIAL NOT NULL, "projectId" integer NOT NULL, "productId" character varying NOT NULL, "bankName" character varying NOT NULL, "accountHolderName" character varying NOT NULL, "accountHolderType" character varying NOT NULL, "country" character varying NOT NULL, "currency" character varying NOT NULL, "accountId" character varying NOT NULL, "fingerprint" character varying NOT NULL, "last4" character varying NOT NULL, "routingNumber" character varying NOT NULL, "status" character varying NOT NULL, CONSTRAINT "PK_f3246deb6b79123482c6adb9745" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stripe_transaction" ("id" SERIAL NOT NULL, "projectId" integer NOT NULL, "status" character varying NOT NULL, "sessionId" character varying, "donorCustomerId" character varying, "donorName" character varying, "donorEmail" character varying, "createdAt" TIMESTAMP NOT NULL, "amount" double precision, "donateToGiveth" boolean, "anonymous" boolean NOT NULL DEFAULT false, "currency" character varying NOT NULL, CONSTRAINT "PK_845103cb14fe333f976df08d57e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "third_party_project_import" ("id" SERIAL NOT NULL, "thirdPartyAPI" character varying, "projectName" character varying, "projectId" integer, "userId" integer, CONSTRAINT "PK_c0f1c7b188e9f45921fc1604eef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "broadcast_notification" ("id" SERIAL NOT NULL, "status" character varying DEFAULT 'pending', "html" character varying NOT NULL, "title" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "adminUserId" integer, CONSTRAINT "PK_0c0bdb12f0f401286f2dc0859dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "qf_round_history" ("id" SERIAL NOT NULL, "projectId" integer NOT NULL, "qfRoundId" integer NOT NULL, "uniqueDonors" integer DEFAULT '0', "donationsCount" integer DEFAULT '0', "raisedFundInUsd" real DEFAULT '0', "matchingFund" real DEFAULT '0', "matchingFundAmount" real, "matchingFundPriceUsd" real, "matchingFundCurrency" character varying, "distributedFundTxHash" character varying, "distributedFundNetwork" character varying, "distributedFundTxDate" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bf31c6a21e3fe7bc4e3504cd933" UNIQUE ("projectId", "qfRoundId"), CONSTRAINT "PK_27bd8a956961b72ef53a51678bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d1f7c0ac0de0f1bf3737989951" ON "qf_round_history" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be248e489b2592a683fd912b9e" ON "qf_round_history" ("qfRoundId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."draft_donation_chaintype_enum" AS ENUM('EVM', 'SOLANA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."draft_donation_status_enum" AS ENUM('pending', 'matched', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "draft_donation" ("id" SERIAL NOT NULL, "networkId" integer NOT NULL, "chainType" "public"."draft_donation_chaintype_enum" NOT NULL DEFAULT 'EVM', "status" "public"."draft_donation_status_enum" NOT NULL DEFAULT 'pending', "toWalletAddress" character varying NOT NULL, "fromWalletAddress" character varying NOT NULL, "tokenAddress" character varying, "currency" character varying NOT NULL, "anonymous" boolean, "amount" real NOT NULL, "projectId" integer, "userId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "referrerId" character varying, "expectedCallData" character varying, "errorMessage" character varying, "matchedDonationId" integer, "useDonationBox" boolean DEFAULT false, "relevantDonationTxHash" character varying, CONSTRAINT "PK_4f2eb58b84fb470edcd483c78af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff4b8666a0090d059f00c59216" ON "draft_donation" ("status") WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_287bf9818fca5b436122847223" ON "draft_donation" ("userId") WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_029453ee31e092317f7f96ee3b" ON "draft_donation" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_af180374473ea402e7595196a6" ON "draft_donation" ("fromWalletAddress", "toWalletAddress", "networkId", "amount", "currency") WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_categories_category" ("projectId" integer NOT NULL, "categoryId" integer NOT NULL, CONSTRAINT "PK_284bdc821ce5aa065f75fd92ebb" PRIMARY KEY ("projectId", "categoryId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c69602ecc23990f6c11b1ed470" ON "project_categories_category" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b47f8b749484ae8bcb6b2550b" ON "project_categories_category" ("categoryId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_qf_rounds_qf_round" ("projectId" integer NOT NULL, "qfRoundId" integer NOT NULL, CONSTRAINT "PK_c93fbec0f33bf068a04ecad6940" PRIMARY KEY ("projectId", "qfRoundId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1407cdfcb90a35632e59da708b" ON "project_qf_rounds_qf_round" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2553d138db03fa2ab1920a0f6" ON "project_qf_rounds_qf_round" ("qfRoundId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_tokens_token" ("organizationId" integer NOT NULL, "tokenId" integer NOT NULL, CONSTRAINT "PK_b811802b9de817da8820f0e60f1" PRIMARY KEY ("organizationId", "tokenId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c59fe0d2f965ccb09648c5d4a9" ON "organization_tokens_token" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f48b3f2fa2c4d25ab3aab7167" ON "organization_tokens_token" ("tokenId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reaction" ADD CONSTRAINT "FK_fa21ddc1cacde7564819e93ce7e" FOREIGN KEY ("projectUpdateId") REFERENCES "project_update"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reaction" ADD CONSTRAINT "FK_c7ad7dffa79f1cfbfa08fe42555" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_verification" ADD CONSTRAINT "FK_2d4eff3e8d902988754fde5be03" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_reason" ADD CONSTRAINT "FK_2edf0fca3c1aca99d1c4924e6a2" FOREIGN KEY ("statusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" ADD CONSTRAINT "FK_9cb7a89f84f11f2d597192a0dd2" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" ADD CONSTRAINT "FK_70d7a7683dcb6ebbbf49c88a069" FOREIGN KEY ("statusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" ADD CONSTRAINT "FK_b16120f321d9c7710f5333103f4" FOREIGN KEY ("prevStatusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" ADD CONSTRAINT "FK_96d372fa1dbff2fbe608e65adb9" FOREIGN KEY ("reasonId") REFERENCES "project_status_reason"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" ADD CONSTRAINT "FK_131c4e303cba479673c628183d5" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profile" ADD CONSTRAINT "FK_8e3aacd2770c260dd9964269062" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profile" ADD CONSTRAINT "FK_36df0f180f71bc7847251cdaecf" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profile" ADD CONSTRAINT "FK_ff8019d5876408cc79c11742ddd" FOREIGN KEY ("projectVerificationFormId") REFERENCES "project_verification_form"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_verification_form" ADD CONSTRAINT "FK_5b7605d4e1a7832bca9911cffae" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_verification_form" ADD CONSTRAINT "FK_095f2561cc6eab0595b871d54b5" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_verification_form" ADD CONSTRAINT "FK_1f0287461e083d8d2f5bf6c6e77" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referred_event" ADD CONSTRAINT "FK_00817a5ab10223c2a735d7d2a58" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_284a4db7a442587ef3e3c44ff44" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_9aebf8ccb9a644c6918cc7520bd" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_bfb9c5ce66e2d9a57dab8dafd56" FOREIGN KEY ("distributedFundQfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_063499388657e648418470a439a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sybil" ADD CONSTRAINT "FK_147e1d41e1b21d7dae364506977" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sybil" ADD CONSTRAINT "FK_021223edea65da358312302dbfc" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_fraud" ADD CONSTRAINT "FK_1dff0856732f6412aea39f7e04a" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_fraud" ADD CONSTRAINT "FK_4481205db975b4134e6ba649760" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_address" ADD CONSTRAINT "FK_e0d07dea550d59fab79f008fc58" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_address" ADD CONSTRAINT "FK_66f21783dcaa674d08ee8c80e4b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "FK_93687121db44dc2ede768252ce6" FOREIGN KEY ("mainCategoryId") REFERENCES "main_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "featured_update" ADD CONSTRAINT "FK_cadbd37858d0c5f9dbbfba97ab7" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "featured_update" ADD CONSTRAINT "FK_e564cf63cce5efdfb466042e823" FOREIGN KEY ("projectUpdateId") REFERENCES "project_update"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_social_media" ADD CONSTRAINT "FK_7e15675ee96198bf302c93e8c25" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_social_media" ADD CONSTRAINT "FK_6c1e8827613c2fea183836d92ca" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_0028dfadf312a1d7f51656c4a9a" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_b6d55aff9b16e061712260da686" FOREIGN KEY ("statusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_da2bed8094dd6e19f78c122d5bd" FOREIGN KEY ("adminUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_update" ADD CONSTRAINT "FK_b1f4c3d398868799849961db390" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_image" ADD CONSTRAINT "FK_7b27cbd4456cc6313d8a476b32d" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "third_party_project_import" ADD CONSTRAINT "FK_5b11cac9589461e86d5689789ce" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "third_party_project_import" ADD CONSTRAINT "FK_c7303efa7801e2a4c2280b5b119" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcast_notification" ADD CONSTRAINT "FK_1ac4352bd066f08f19d3bf4834c" FOREIGN KEY ("adminUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round_history" ADD CONSTRAINT "FK_d1f7c0ac0de0f1bf37379899512" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round_history" ADD CONSTRAINT "FK_be248e489b2592a683fd912b9ee" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_categories_category" ADD CONSTRAINT "FK_c69602ecc23990f6c11b1ed4700" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_categories_category" ADD CONSTRAINT "FK_9b47f8b749484ae8bcb6b2550b7" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_qf_rounds_qf_round" ADD CONSTRAINT "FK_1407cdfcb90a35632e59da708bc" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_qf_rounds_qf_round" ADD CONSTRAINT "FK_b2553d138db03fa2ab1920a0f6b" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_tokens_token" ADD CONSTRAINT "FK_c59fe0d2f965ccb09648c5d4a9c" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_tokens_token" ADD CONSTRAINT "FK_2f48b3f2fa2c4d25ab3aab7167e" FOREIGN KEY ("tokenId") REFERENCES "token"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_tokens_token" DROP CONSTRAINT "FK_2f48b3f2fa2c4d25ab3aab7167e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_tokens_token" DROP CONSTRAINT "FK_c59fe0d2f965ccb09648c5d4a9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_qf_rounds_qf_round" DROP CONSTRAINT "FK_b2553d138db03fa2ab1920a0f6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_qf_rounds_qf_round" DROP CONSTRAINT "FK_1407cdfcb90a35632e59da708bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_categories_category" DROP CONSTRAINT "FK_9b47f8b749484ae8bcb6b2550b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_categories_category" DROP CONSTRAINT "FK_c69602ecc23990f6c11b1ed4700"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round_history" DROP CONSTRAINT "FK_be248e489b2592a683fd912b9ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round_history" DROP CONSTRAINT "FK_d1f7c0ac0de0f1bf37379899512"`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcast_notification" DROP CONSTRAINT "FK_1ac4352bd066f08f19d3bf4834c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "third_party_project_import" DROP CONSTRAINT "FK_c7303efa7801e2a4c2280b5b119"`,
    );
    await queryRunner.query(
      `ALTER TABLE "third_party_project_import" DROP CONSTRAINT "FK_5b11cac9589461e86d5689789ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_image" DROP CONSTRAINT "FK_7b27cbd4456cc6313d8a476b32d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_update" DROP CONSTRAINT "FK_b1f4c3d398868799849961db390"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_da2bed8094dd6e19f78c122d5bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_b6d55aff9b16e061712260da686"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_0028dfadf312a1d7f51656c4a9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_social_media" DROP CONSTRAINT "FK_6c1e8827613c2fea183836d92ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_social_media" DROP CONSTRAINT "FK_7e15675ee96198bf302c93e8c25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "featured_update" DROP CONSTRAINT "FK_e564cf63cce5efdfb466042e823"`,
    );
    await queryRunner.query(
      `ALTER TABLE "featured_update" DROP CONSTRAINT "FK_cadbd37858d0c5f9dbbfba97ab7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "FK_93687121db44dc2ede768252ce6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_address" DROP CONSTRAINT "FK_66f21783dcaa674d08ee8c80e4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_address" DROP CONSTRAINT "FK_e0d07dea550d59fab79f008fc58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_fraud" DROP CONSTRAINT "FK_4481205db975b4134e6ba649760"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_fraud" DROP CONSTRAINT "FK_1dff0856732f6412aea39f7e04a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sybil" DROP CONSTRAINT "FK_021223edea65da358312302dbfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sybil" DROP CONSTRAINT "FK_147e1d41e1b21d7dae364506977"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_063499388657e648418470a439a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_bfb9c5ce66e2d9a57dab8dafd56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_9aebf8ccb9a644c6918cc7520bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_284a4db7a442587ef3e3c44ff44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referred_event" DROP CONSTRAINT "FK_00817a5ab10223c2a735d7d2a58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_verification_form" DROP CONSTRAINT "FK_1f0287461e083d8d2f5bf6c6e77"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_verification_form" DROP CONSTRAINT "FK_095f2561cc6eab0595b871d54b5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_verification_form" DROP CONSTRAINT "FK_5b7605d4e1a7832bca9911cffae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profile" DROP CONSTRAINT "FK_ff8019d5876408cc79c11742ddd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profile" DROP CONSTRAINT "FK_36df0f180f71bc7847251cdaecf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profile" DROP CONSTRAINT "FK_8e3aacd2770c260dd9964269062"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" DROP CONSTRAINT "FK_131c4e303cba479673c628183d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" DROP CONSTRAINT "FK_96d372fa1dbff2fbe608e65adb9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" DROP CONSTRAINT "FK_b16120f321d9c7710f5333103f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" DROP CONSTRAINT "FK_70d7a7683dcb6ebbbf49c88a069"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_history" DROP CONSTRAINT "FK_9cb7a89f84f11f2d597192a0dd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_status_reason" DROP CONSTRAINT "FK_2edf0fca3c1aca99d1c4924e6a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_verification" DROP CONSTRAINT "FK_2d4eff3e8d902988754fde5be03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reaction" DROP CONSTRAINT "FK_c7ad7dffa79f1cfbfa08fe42555"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reaction" DROP CONSTRAINT "FK_fa21ddc1cacde7564819e93ce7e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f48b3f2fa2c4d25ab3aab7167"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c59fe0d2f965ccb09648c5d4a9"`,
    );
    await queryRunner.query(`DROP TABLE "organization_tokens_token"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2553d138db03fa2ab1920a0f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1407cdfcb90a35632e59da708b"`,
    );
    await queryRunner.query(`DROP TABLE "project_qf_rounds_qf_round"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b47f8b749484ae8bcb6b2550b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c69602ecc23990f6c11b1ed470"`,
    );
    await queryRunner.query(`DROP TABLE "project_categories_category"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af180374473ea402e7595196a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_029453ee31e092317f7f96ee3b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_287bf9818fca5b436122847223"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ff4b8666a0090d059f00c59216"`,
    );
    await queryRunner.query(`DROP TABLE "draft_donation"`);
    await queryRunner.query(`DROP TYPE "public"."draft_donation_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."draft_donation_chaintype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be248e489b2592a683fd912b9e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d1f7c0ac0de0f1bf3737989951"`,
    );
    await queryRunner.query(`DROP TABLE "qf_round_history"`);
    await queryRunner.query(`DROP TABLE "broadcast_notification"`);
    await queryRunner.query(`DROP TABLE "third_party_project_import"`);
    await queryRunner.query(`DROP TABLE "stripe_transaction"`);
    await queryRunner.query(`DROP TABLE "bank_account"`);
    await queryRunner.query(`DROP TABLE "project_image"`);
    await queryRunner.query(`DROP TABLE "wallet"`);
    await queryRunner.query(`DROP TABLE "organization"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e29282c925a82d9e50480c2af"`,
    );
    await queryRunner.query(`DROP TABLE "token"`);
    await queryRunner.query(`DROP TYPE "public"."token_chaintype_enum"`);
    await queryRunner.query(`DROP TABLE "project_update"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da2bed8094dd6e19f78c122d5b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b6d55aff9b16e061712260da68"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_230ef230f8b5b301813465b3d5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4834506581f3c8eaddd003f770"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b567170a13f26c67548fd9d159"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6fce32ddd71197807027be6ad3"`,
    );
    await queryRunner.query(`DROP TABLE "project"`);
    await queryRunner.query(`DROP TYPE "public"."project_reviewstatus_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c1e8827613c2fea183836d92c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e15675ee96198bf302c93e8c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_59afc67000c5eace4b2ae4d921"`,
    );
    await queryRunner.query(`DROP TABLE "project_social_media"`);
    await queryRunner.query(
      `DROP TYPE "public"."project_social_media_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "campaign"`);
    await queryRunner.query(`DROP TYPE "public"."campaign_sortingfield_enum"`);
    await queryRunner.query(`DROP TYPE "public"."campaign_filterfields_enum"`);
    await queryRunner.query(`DROP TYPE "public"."campaign_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e564cf63cce5efdfb466042e82"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cadbd37858d0c5f9dbbfba97ab"`,
    );
    await queryRunner.query(`DROP TABLE "featured_update"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TABLE "main_category"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66f21783dcaa674d08ee8c80e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0d07dea550d59fab79f008fc5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_680862dac01bd9840b69180f83"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7d1cba3859f6b1d43777fc89f0"`,
    );
    await queryRunner.query(`DROP TABLE "project_address"`);
    await queryRunner.query(
      `DROP TYPE "public"."project_address_chaintype_enum"`,
    );
    await queryRunner.query(`DROP TABLE "project_fraud"`);
    await queryRunner.query(`DROP TABLE "sybil"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f680c2a4a72294f3a60f8318b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61b2af1a91b1633d9f4bf15b93"`,
    );
    await queryRunner.query(`DROP TABLE "user_qf_round_model_score"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b80df3b6dd2e3ed70aef06f67f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_063499388657e648418470a439"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bfb9c5ce66e2d9a57dab8dafd5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9aebf8ccb9a644c6918cc7520b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_284a4db7a442587ef3e3c44ff4"`,
    );
    await queryRunner.query(`DROP TABLE "donation"`);
    await queryRunner.query(`DROP TYPE "public"."donation_chaintype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b04a22720bff08d527a67a63e8"`,
    );
    await queryRunner.query(`DROP TABLE "qf_round"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "referred_event"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f0287461e083d8d2f5bf6c6e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_095f2561cc6eab0595b871d54b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5b7605d4e1a7832bca9911cffa"`,
    );
    await queryRunner.query(`DROP TABLE "project_verification_form"`);
    await queryRunner.query(
      `DROP TYPE "public"."project_verification_form_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0239381aa055d6ef47fafba6cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ff8019d5876408cc79c11742dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36df0f180f71bc7847251cdaec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e3aacd2770c260dd996426906"`,
    );
    await queryRunner.query(`DROP TABLE "social_profile"`);
    await queryRunner.query(`DROP TABLE "project_status_history"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d0a4ed696b85b68a07da85ee8"`,
    );
    await queryRunner.query(`DROP TABLE "project_status"`);
    await queryRunner.query(`DROP TABLE "project_status_reason"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d4eff3e8d902988754fde5be0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a5dcfc24e8efb92d898d0dd87"`,
    );
    await queryRunner.query(`DROP TABLE "account_verification"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d63fe644dfb18b2fd1c114551f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5fb4f3133d8fcbbf848c6b7e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7ad7dffa79f1cfbfa08fe4255"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fa21ddc1cacde7564819e93ce7"`,
    );
    await queryRunner.query(`DROP TABLE "reaction"`);
  }
}
