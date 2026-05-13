import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { Project, ProjStatus, ReviewStatus } from '../entities/project';
import { ProjectAddress } from '../entities/projectAddress';
import { Token } from '../entities/token';
import { NETWORKS_IDS_TO_NAME } from '../provider';
import { getGlobalConfigurationValues } from '../repositories/globalConfigurationRepository';
import { ChainType } from '../types/network';

const GIVETH_COMMUNITY_OF_MAKERS_SLUGS = new Set([
  'giveth',
  'giveth-community-of-makers',
  'the-giveth-community-of-makers',
]);
const DEFAULT_MINIMUM_USD_AMOUNT = 4;
const COMMUNITY_OF_MAKERS_MINIMUM_USD_AMOUNT = 0.05;
const DEFAULT_MINIMUM_USD_AMOUNT_CONFIG_KEY = 'eligible-donation-minimum-usd';
const COMMUNITY_OF_MAKERS_MINIMUM_USD_AMOUNT_CONFIG_KEY =
  'community-makers-eligible-donation-minimum-usd';

type CsvValue = string | number | boolean | null;

export interface ExportEligibleDonationsFilters {
  fromDate?: string;
  toDate?: string;
  networkId?: number;
  projectId?: number;
  userId?: number;
  isEligibleForGivbacks?: boolean;
}

interface DonationExportRow {
  donationId: number;
  createdAt: string;
  status: string;
  chainType: string;
  transactionId: string;
  transactionNetworkId: number;
  network: string;
  nonce: number | null;
  fromWalletAddress: string;
  toWalletAddress: string;
  anonymous: boolean;
  currency: string;
  tokenAddress: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenNetworkId: number | null;
  tokenChainType: string | null;
  tokenIsActive: boolean | null;
  tokenIsGivbacksEligible: boolean;
  amount: number;
  valueUsd: number | null;
  projectGivbackFactor: number;
  valueUsdAfterGivbackFactor: number | null;
  priceUsd: number | null;
  legacyRecurringDonationId: number | null;
  parentRecurringDonationTxHash: string | null;
  legacyVirtualPeriodStart: string | null;
  legacyVirtualPeriodEnd: string | null;
  eligibilityAmountThresholdUsd: number;
  meetsEligibilityAmountThreshold: boolean;
  donorIsPurpleListed: boolean;
  isEligibleForGivbacks: boolean;
  eligibilityFailureReasons: string;
  isProjectGivbackEligibleSnapshot: boolean;
  projectId: number;
  projectTitle: string;
  projectSlug: string;
  projectIsGivbacksEligible: boolean;
  projectAdminUserId: number | null;
  projectAdminName: string | null;
  projectAdminEmail: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  qfRoundId: number | null;
  qfRoundName: string | null;
  isCustomToken: boolean;
  isExternal: boolean;
  useDonationBox: boolean;
  donationPercentage: number | null;
  qfRoundUserScore: number | null;
  verifyErrorMessage: string | null;
  qfRoundErrorMessage: string | null;
}

const DONATION_EXPORT_HEADERS: Array<keyof DonationExportRow> = [
  'donationId',
  'createdAt',
  'status',
  'chainType',
  'transactionId',
  'transactionNetworkId',
  'network',
  'nonce',
  'fromWalletAddress',
  'toWalletAddress',
  'anonymous',
  'currency',
  'tokenAddress',
  'tokenName',
  'tokenSymbol',
  'tokenNetworkId',
  'tokenChainType',
  'tokenIsActive',
  'tokenIsGivbacksEligible',
  'amount',
  'valueUsd',
  'projectGivbackFactor',
  'valueUsdAfterGivbackFactor',
  'priceUsd',
  'legacyRecurringDonationId',
  'parentRecurringDonationTxHash',
  'legacyVirtualPeriodStart',
  'legacyVirtualPeriodEnd',
  'eligibilityAmountThresholdUsd',
  'meetsEligibilityAmountThreshold',
  'donorIsPurpleListed',
  'isEligibleForGivbacks',
  'eligibilityFailureReasons',
  'isProjectGivbackEligibleSnapshot',
  'projectId',
  'projectTitle',
  'projectSlug',
  'projectIsGivbacksEligible',
  'projectAdminUserId',
  'projectAdminName',
  'projectAdminEmail',
  'userId',
  'userName',
  'userEmail',
  'qfRoundId',
  'qfRoundName',
  'isCustomToken',
  'isExternal',
  'useDonationBox',
  'donationPercentage',
  'qfRoundUserScore',
  'verifyErrorMessage',
  'qfRoundErrorMessage',
];

type ConsolidatedDonation = Donation & {
  legacyRecurringDonationId?: number | null;
  parentRecurringDonationTxHash?: string | null;
  legacyVirtualPeriodStart?: Date | null;
  legacyVirtualPeriodEnd?: Date | null;
};

export const getCurrentEligibilityThresholds = async (): Promise<{
  defaultMinimumUsdAmount: number;
  communityOfMakersMinimumUsdAmount: number;
}> => {
  const configs = await getGlobalConfigurationValues([
    DEFAULT_MINIMUM_USD_AMOUNT_CONFIG_KEY,
    COMMUNITY_OF_MAKERS_MINIMUM_USD_AMOUNT_CONFIG_KEY,
  ]);

  return {
    defaultMinimumUsdAmount: normalizeThreshold(
      configs[DEFAULT_MINIMUM_USD_AMOUNT_CONFIG_KEY],
      DEFAULT_MINIMUM_USD_AMOUNT,
    ),
    communityOfMakersMinimumUsdAmount: normalizeThreshold(
      configs[COMMUNITY_OF_MAKERS_MINIMUM_USD_AMOUNT_CONFIG_KEY],
      COMMUNITY_OF_MAKERS_MINIMUM_USD_AMOUNT,
    ),
  };
};

export const exportEligibleDonations = async (
  filters: ExportEligibleDonationsFilters = {},
): Promise<{
  csvContent: string;
  fileName: string;
  totalDonations: number;
}> => {
  const thresholds = await getCurrentEligibilityThresholds();
  const [donations, eligibleTokens, purpleListAddresses] = await Promise.all([
    findExportableDonations(filters),
    Token.find({ where: { isGivbackEligible: true } }),
    getPurpleListAddressKeys(),
  ]);

  const eligibleTokensByAddress = new Map(
    eligibleTokens
      .filter(token => token.address)
      .map(token => [
        buildTokenAddressKey(token.chainType, token.networkId, token.address),
        token,
      ]),
  );
  const eligibleTokensBySymbol = new Map(
    eligibleTokens.map(token => [
      buildTokenSymbolKey(token.chainType, token.networkId, token.symbol),
      token,
    ]),
  );
  const rows: DonationExportRow[] = [];

  for (const donation of consolidateRecurringDonations(donations)) {
    const isDonorPurpleListed = purpleListAddresses.has(
      buildPurpleListKey(donation.fromWalletAddress, donation.chainType),
    );
    const matchedToken =
      (donation.tokenAddress
        ? eligibleTokensByAddress.get(
            buildTokenAddressKey(
              donation.chainType,
              donation.transactionNetworkId,
              donation.tokenAddress,
            ),
          )
        : undefined) ??
      eligibleTokensBySymbol.get(
        buildTokenSymbolKey(
          donation.chainType,
          donation.transactionNetworkId,
          donation.currency,
        ),
      );
    const minimumUsdAmount = isGivethCommunityOfMakersProject(
      donation.project.slug || '',
    )
      ? thresholds.communityOfMakersMinimumUsdAmount
      : thresholds.defaultMinimumUsdAmount;
    const meetsEligibilityAmountThreshold =
      (donation.valueUsd || 0) >= minimumUsdAmount;
    const eligibilityFailureReasons = buildEligibilityFailureReasons({
      isDonorPurpleListed,
      isProjectGivbacksEligibleSnapshot: donation.isProjectGivbackEligible,
      tokenIsGivbacksEligible: Boolean(matchedToken),
      meetsEligibilityAmountThreshold,
    });
    const isEligibleForGivbacks = eligibilityFailureReasons.length === 0;

    if (
      filters.isEligibleForGivbacks !== undefined &&
      isEligibleForGivbacks !== filters.isEligibleForGivbacks
    ) {
      continue;
    }

    const projectGivbackFactor = normalizeGivbackFactor(donation.givbackFactor);
    const valueUsdAfterGivbackFactor =
      donation.valueUsd === null || donation.valueUsd === undefined
        ? null
        : Number((donation.valueUsd * projectGivbackFactor).toFixed(6));

    rows.push({
      donationId: donation.id,
      createdAt: donation.createdAt.toISOString(),
      status: donation.status,
      chainType: donation.chainType,
      transactionId: donation.transactionId,
      transactionNetworkId: donation.transactionNetworkId,
      network: getNetworkNameById(donation.transactionNetworkId),
      nonce: donation.nonce || null,
      fromWalletAddress: donation.fromWalletAddress,
      toWalletAddress: donation.toWalletAddress,
      anonymous: Boolean(donation.anonymous),
      currency: donation.currency,
      tokenAddress: donation.tokenAddress || null,
      tokenName: matchedToken?.name || null,
      tokenSymbol: matchedToken?.symbol || donation.currency,
      tokenNetworkId: matchedToken?.networkId || donation.transactionNetworkId,
      tokenChainType: matchedToken?.chainType || donation.chainType,
      tokenIsActive: null,
      tokenIsGivbacksEligible: Boolean(matchedToken),
      amount: donation.amount,
      valueUsd: donation.valueUsd ?? null,
      projectGivbackFactor,
      valueUsdAfterGivbackFactor,
      priceUsd: donation.priceUsd ?? null,
      legacyRecurringDonationId: donation.legacyRecurringDonationId || null,
      parentRecurringDonationTxHash:
        donation.parentRecurringDonationTxHash || null,
      legacyVirtualPeriodStart:
        donation.legacyVirtualPeriodStart?.toISOString() || null,
      legacyVirtualPeriodEnd:
        donation.legacyVirtualPeriodEnd?.toISOString() || null,
      eligibilityAmountThresholdUsd: minimumUsdAmount,
      meetsEligibilityAmountThreshold,
      donorIsPurpleListed: isDonorPurpleListed,
      isEligibleForGivbacks,
      eligibilityFailureReasons: eligibilityFailureReasons.join('|'),
      isProjectGivbackEligibleSnapshot: donation.isProjectGivbackEligible,
      projectId: donation.project.id,
      projectTitle: donation.project.title,
      projectSlug: donation.project.slug || '',
      projectIsGivbacksEligible: donation.project.isGivbackEligible,
      projectAdminUserId: donation.project.adminUserId || null,
      projectAdminName: donation.project.adminUser?.name || null,
      projectAdminEmail: donation.project.adminUser?.email || null,
      userId: donation.user?.id || donation.userId || null,
      userName: donation.user?.name || null,
      userEmail: donation.user?.email || null,
      qfRoundId: donation.qfRound?.id || donation.qfRoundId || null,
      qfRoundName: donation.qfRound?.name || donation.qfRound?.title || null,
      isCustomToken: Boolean(donation.isCustomToken),
      isExternal: Boolean(donation.isExternal),
      useDonationBox: Boolean(donation.useDonationBox),
      donationPercentage:
        donation.donationPercentage === null ||
        donation.donationPercentage === undefined
          ? null
          : Number(donation.donationPercentage),
      qfRoundUserScore: donation.qfRoundUserScore ?? null,
      verifyErrorMessage: donation.verifyErrorMessage || null,
      qfRoundErrorMessage: donation.qfRoundErrorMessage || null,
    });
  }

  return {
    csvContent: generateCsv(rows),
    fileName: buildFileName(),
    totalDonations: rows.length,
  };
};

const findExportableDonations = async (
  filters: ExportEligibleDonationsFilters,
): Promise<Donation[]> => {
  const query = Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.user', 'user')
    .leftJoinAndSelect('donation.project', 'project')
    .leftJoinAndSelect('project.adminUser', 'projectAdmin')
    .leftJoinAndSelect('donation.qfRound', 'qfRound')
    .leftJoinAndSelect('donation.recurringDonation', 'recurringDonation')
    .where('donation.status = :status', {
      status: DONATION_STATUS.VERIFIED,
    })
    .andWhere('donation."valueUsd" IS NOT NULL')
    .andWhere('donation."distributedFundQfRoundId" IS NULL')
    .orderBy('donation.createdAt', 'DESC');

  const fromDate = filters.fromDate
    ? parseDateFilter(filters.fromDate, 'fromDate')
    : undefined;
  const toDate = filters.toDate
    ? parseDateFilter(filters.toDate, 'toDate')
    : undefined;

  if (fromDate || toDate) {
    const regularCreatedAtConditions: string[] = [
      'donation."recurringDonationId" IS NULL',
    ];
    const recurringPeriodEndConditions: string[] = [
      'donation."recurringDonationId" IS NOT NULL',
    ];

    if (fromDate) {
      regularCreatedAtConditions.push('donation."createdAt" >= :fromDate');
      recurringPeriodEndConditions.push(
        'donation."virtualPeriodEnd" >= :fromDateTimestamp',
      );
      query.setParameter('fromDate', fromDate);
      query.setParameter('fromDateTimestamp', dateToUnixSeconds(fromDate));
    }

    if (toDate) {
      regularCreatedAtConditions.push('donation."createdAt" <= :toDate');
      recurringPeriodEndConditions.push(
        'donation."virtualPeriodEnd" <= :toDateTimestamp',
      );
      query.setParameter('toDate', toDate);
      query.setParameter('toDateTimestamp', dateToUnixSeconds(toDate));
    }

    query.andWhere(
      `((${regularCreatedAtConditions.join(
        ' AND ',
      )}) OR (${recurringPeriodEndConditions.join(' AND ')}))`,
    );
  }

  if (filters.networkId) {
    query.andWhere('donation."transactionNetworkId" = :networkId', {
      networkId: filters.networkId,
    });
  }

  if (filters.projectId) {
    query.andWhere('donation."projectId" = :projectId', {
      projectId: filters.projectId,
    });
  }

  if (filters.userId) {
    query.andWhere('donation."userId" = :userId', {
      userId: filters.userId,
    });
  }

  return query.getMany();
};

const consolidateRecurringDonations = (
  donations: Donation[],
): ConsolidatedDonation[] => {
  const consolidated = new Map<number, ConsolidatedDonation>();
  const regularDonations: ConsolidatedDonation[] = [];

  for (const donation of donations) {
    if (!donation.recurringDonationId) {
      const regularDonation = donation as ConsolidatedDonation;
      regularDonation.legacyRecurringDonationId = null;
      regularDonation.parentRecurringDonationTxHash = null;
      regularDonation.legacyVirtualPeriodStart = null;
      regularDonation.legacyVirtualPeriodEnd = null;
      regularDonations.push(regularDonation);
      continue;
    }

    const recurringDonationId = donation.recurringDonationId;
    const existing = consolidated.get(recurringDonationId);
    const periodStart = unixSecondsToDate(donation.virtualPeriodStart);
    const periodEnd = unixSecondsToDate(donation.virtualPeriodEnd);

    if (!existing) {
      const recurringDonation = donation as ConsolidatedDonation;
      recurringDonation.transactionId = `recurring-${recurringDonationId}`;
      recurringDonation.legacyRecurringDonationId = recurringDonationId;
      recurringDonation.parentRecurringDonationTxHash =
        donation.recurringDonation?.txHash || null;
      recurringDonation.legacyVirtualPeriodStart = periodStart;
      recurringDonation.legacyVirtualPeriodEnd = periodEnd;
      consolidated.set(recurringDonationId, recurringDonation);
      continue;
    }

    existing.amount += donation.amount;
    existing.valueUsd =
      Number(existing.valueUsd || 0) + Number(donation.valueUsd || 0);
    existing.parentRecurringDonationTxHash ||=
      donation.recurringDonation?.txHash || null;

    if (
      periodStart &&
      (!existing.legacyVirtualPeriodStart ||
        periodStart < existing.legacyVirtualPeriodStart)
    ) {
      existing.legacyVirtualPeriodStart = periodStart;
    }

    if (
      periodEnd &&
      (!existing.legacyVirtualPeriodEnd ||
        periodEnd > existing.legacyVirtualPeriodEnd)
    ) {
      existing.legacyVirtualPeriodEnd = periodEnd;
    }
  }

  return [...regularDonations, ...consolidated.values()];
};

const getPurpleListAddressKeys = async (): Promise<Set<string>> => {
  const [projectAddresses, verifiedForms] = await Promise.all([
    ProjectAddress.createQueryBuilder('projectAddress')
      .innerJoin('projectAddress.project', 'project')
      .where('projectAddress.isRecipient = true')
      .andWhere('project.verified = true')
      .andWhere('project.statusId = :statusId', {
        statusId: ProjStatus.active,
      })
      .select(['projectAddress.address', 'projectAddress.chainType'])
      .getMany(),
    ProjectVerificationForm.find({
      where: {
        status: PROJECT_VERIFICATION_STATUSES.VERIFIED,
        project: {
          reviewStatus: ReviewStatus.Listed,
          statusId: ProjStatus.active,
        } as Project,
      },
      relations: ['project'],
    }),
  ]);
  const keys = new Set<string>();

  projectAddresses.forEach(address => {
    keys.add(buildPurpleListKey(address.address, address.chainType));
  });
  verifiedForms
    .flatMap(form => form.managingFunds?.relatedAddresses || [])
    .forEach(address => {
      if (!address.address) return;

      keys.add(
        buildPurpleListKey(
          address.address,
          resolveChainType(address.chainType),
        ),
      );
    });

  return keys;
};

const buildEligibilityFailureReasons = (input: {
  isDonorPurpleListed: boolean;
  isProjectGivbacksEligibleSnapshot: boolean;
  tokenIsGivbacksEligible: boolean;
  meetsEligibilityAmountThreshold: boolean;
}): string[] => {
  const reasons: string[] = [];

  if (input.isDonorPurpleListed) {
    reasons.push('PURPLE_LISTED');
  }

  if (!input.isProjectGivbacksEligibleSnapshot) {
    reasons.push('PROJECT_NOT_GIVBACKS_ELIGIBLE_SNAPSHOT');
  }

  if (!input.tokenIsGivbacksEligible) {
    reasons.push('TOKEN_NOT_GIVBACKS_ELIGIBLE');
  }

  if (!input.meetsEligibilityAmountThreshold) {
    reasons.push('BELOW_MINIMUM_USD_AMOUNT');
  }

  return reasons;
};

const buildPurpleListKey = (address: string, chainType: ChainType): string =>
  `${chainType}:${normalizeAddress(address, chainType)}`;

const buildTokenAddressKey = (
  chainType: ChainType,
  networkId: number,
  address: string,
): string =>
  `${chainType}:${networkId}:${normalizeAddress(address, chainType)}`;

const buildTokenSymbolKey = (
  chainType: ChainType,
  networkId: number,
  symbol: string,
): string => `${chainType}:${networkId}:${symbol.toUpperCase()}`;

const normalizeAddress = (address: string, chainType: ChainType): string => {
  const normalizedAddress = address.trim();
  return chainType === ChainType.EVM
    ? normalizedAddress.toLowerCase()
    : normalizedAddress;
};

const resolveChainType = (chainType: unknown): ChainType => {
  if (
    typeof chainType === 'string' &&
    Object.values(ChainType).includes(chainType.toUpperCase() as ChainType)
  ) {
    return chainType.toUpperCase() as ChainType;
  }

  return ChainType.EVM;
};

const isGivethCommunityOfMakersProject = (projectSlug: string): boolean =>
  GIVETH_COMMUNITY_OF_MAKERS_SLUGS.has(projectSlug);

const normalizeGivbackFactor = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeThreshold = (
  value: string | number | null,
  fallbackValue: number,
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackValue;
};

const getNetworkNameById = (networkId: number): string =>
  NETWORKS_IDS_TO_NAME[networkId] || String(networkId);

const parseDateFilter = (
  value: string,
  fieldName: 'fromDate' | 'toDate',
): Date => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid ${fieldName} value`);
  }

  if (fieldName === 'toDate' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsedDate.setUTCHours(23, 59, 59, 999);
  }

  return parsedDate;
};

const dateToUnixSeconds = (date: Date): number =>
  Math.floor(date.getTime() / 1000);

const unixSecondsToDate = (value?: number | null): Date | null => {
  if (!value) return null;
  return new Date(value * 1000);
};

const buildFileName = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `givbacks-eligible-donations-${timestamp}.csv`;
};

const generateCsv = (rows: DonationExportRow[]): string => {
  const csvRows = [DONATION_EXPORT_HEADERS.join(',')];

  for (const row of rows) {
    const values = DONATION_EXPORT_HEADERS.map(header =>
      escapeCsvValue(row[header]),
    );
    csvRows.push(values.join(','));
  }

  return csvRows.join('\r\n');
};

const escapeCsvValue = (value: CsvValue): string => {
  if (value === null) {
    return '';
  }

  let stringValue = String(value);
  if (['=', '+', '-', '@', '\t', '\r'].includes(stringValue.charAt(0))) {
    stringValue = `'${stringValue}`;
  }

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes('\t')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};
