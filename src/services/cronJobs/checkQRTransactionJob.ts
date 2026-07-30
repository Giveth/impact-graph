import { schedule } from 'node-cron';
import axios from 'axios';
import config from '../../config';
import { logger } from '../../utils/logger';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../../entities/draftDonation';
import { DONATION_STATUS, Donation } from '../../entities/donation';
import { Token } from '../../entities/token';
import {
  createDonation,
  findDonationById,
  findDonationsByTransactionId,
} from '../../repositories/donationRepository';
import { findProjectById } from '../../repositories/projectRepository';
import {
  findDraftDonationByMatchedDonationId,
  updateDraftDonationStatus,
} from '../../repositories/draftDonationRepository';
import { AppDataSource } from '../../orm';
import { CoingeckoPriceAdapter } from '../../adapters/price/CoingeckoPriceAdapter';
import { findUserById } from '../../repositories/userRepository';
import { relatedActiveQfRoundForProject } from '../qfRoundService';
import {
  selectQfRoundForProject,
  QfRoundSmartSelectError,
} from '../qfRoundSmartSelectService';
import { QfRound } from '../../entities/qfRound';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';
import { notifyClients } from '../sse/sse';
import { calculateGivbackFactor } from '../givbackService';

const STELLAR_HORIZON_API =
  (config.get('STELLAR_HORIZON_API_URL') as string) ||
  'https://horizon.stellar.org';
const cronJobTime =
  (config.get('CHECK_QR_TRANSACTIONS_CRONJOB_EXPRESSION') as string) ||
  '0 */1 * * * *';

// Namespace for pg advisory locks used by the QR draft-donation flow.
// Must not collide with other advisory-lock namespaces in the project
// (e.g. POWER_BOOSTING_USER_LOCK_KEY = 48_103).
export const QR_DRAFT_DONATION_LOCK_NAMESPACE = 48_205;
// Namespace for per-transaction advisory locks, keyed by a value derived
// from the Stellar transaction hash. A separate namespace from the draft/run
// locks, so hash-derived keys can never collide with draft-id keys.
export const QR_TX_LOCK_NAMESPACE = 48_206;
// Draft ids start at 1, so 0 is reserved for the whole-cron-run lock.
export const QR_CRON_RUN_LOCK_ID = 0;
// One minute of grace after expiresAt during which a payment is still
// accepted and the draft is not yet failed. Shared with the resolver so the
// read path can never fail a draft the matcher would still accept.
export const DRAFT_DONATION_EXPIRY_GRACE_MS = 60 * 1000;
// A failed QR draft stays eligible for transaction scanning this long after
// its expiry, so a payment Horizon indexed late (after the frontend timed
// the draft out via markDraftDonationAsFailed) can still be reconciled to
// matched. Bounded so failed drafts are not Horizon-scanned forever.
export const QR_FAILED_DRAFT_RECONCILIATION_WINDOW_MS = 30 * 60 * 1000;
// How long a matcher waits for another execution's per-draft or per-tx lock,
// and the cap on any single Horizon request. Bounded so a hung execution can
// only delay a draft, never pin connections or wedge the cron indefinitely.
const QR_DRAFT_LOCK_WAIT_MS = 30 * 1000;
const HORIZON_REQUEST_TIMEOUT_MS = 30 * 1000;

// Deterministic 32-bit advisory-lock key for a Stellar transaction hash
// (first 8 hex chars as a signed int32). A collision between two different
// hashes only causes unnecessary serialization, never a correctness issue.
export function txHashToLockId(txHash: string): number {
  return (parseInt(txHash.slice(0, 8), 16) || 0) | 0;
}

// Runs fn while holding a PostgreSQL advisory lock, which is safe across
// multiple Node processes/containers sharing the same database. The lock is
// polled with pg_try_advisory_lock for at most waitMs (0 = single attempt)
// instead of blocking in pg_advisory_lock, so a stuck holder can never pin
// waiters' pool connections indefinitely. Returns false when the lock could
// not be acquired within waitMs and fn was skipped.
async function withQrAdvisoryLock(
  namespace: number,
  lockId: number,
  waitMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const queryRunner = AppDataSource.getDataSource().createQueryRunner();
  await queryRunner.connect();
  try {
    const deadline = Date.now() + waitMs;
    for (;;) {
      const result = await queryRunner.query(
        'SELECT pg_try_advisory_lock($1, $2) as acquired',
        [namespace, lockId],
      );
      if (result?.[0]?.acquired) break;
      if (Date.now() >= deadline) return false;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
      await fn();
    } finally {
      await queryRunner.query('SELECT pg_advisory_unlock($1, $2)', [
        namespace,
        lockId,
      ]);
    }
    return true;
  } finally {
    await queryRunner.release();
  }
}

// Single source of truth for aligning a draft with a donation (the one it
// references, or an explicitly provided one). Returns the donation when it is
// live (non-failed) — the draft is made MATCHED, including fromWalletAddress.
// Returns null when the donation is missing or failed: the draft is left
// untouched so callers can keep scanning for a retry payment or fail it via
// the guarded expiry update. With linkFailedDonation=true a failed donation
// is instead recorded on the draft (status failed + matchedDonationId), used
// when a payment has just been attributed to the draft.
export async function reconcileDraftWithMatchedDonation(
  draftDonation: DraftDonation,
  source: string,
  options: { donation?: Donation; linkFailedDonation?: boolean } = {},
): Promise<Donation | null> {
  const matchedDonation =
    options.donation ??
    (await findDonationById(draftDonation.matchedDonationId!));
  logger.debug('reconcileDraftWithMatchedDonation() has been called', {
    draftDonationId: draftDonation.id,
    matchedDonationId: matchedDonation?.id,
    source,
  });
  if (!matchedDonation) return null;
  if (matchedDonation.status === DONATION_STATUS.FAILED) {
    if (options.linkFailedDonation) {
      await updateDraftDonationStatus({
        donationId: draftDonation.id,
        status: DRAFT_DONATION_STATUS.FAILED,
        fromWalletAddress: matchedDonation.fromWalletAddress,
        matchedDonationId: matchedDonation.id,
        txHash: matchedDonation.transactionId,
        source: 'reconciliation',
      });
    }
    // The on-chain transaction genuinely failed; don't hide it.
    return null;
  }
  if (
    draftDonation.status !== DRAFT_DONATION_STATUS.MATCHED ||
    draftDonation.matchedDonationId !== matchedDonation.id
  ) {
    await updateDraftDonationStatus({
      donationId: draftDonation.id,
      status: DRAFT_DONATION_STATUS.MATCHED,
      fromWalletAddress: matchedDonation.fromWalletAddress,
      matchedDonationId: matchedDonation.id,
      txHash: matchedDonation.transactionId,
      source: 'reconciliation',
    });
  }
  return matchedDonation;
}

// Pending QR drafts, plus recently-failed ones still inside the
// reconciliation window: their payment may have reached Horizon only after
// the frontend timed the draft out, and checkTransactions can then reconcile
// failed -> matched. Failed drafts older than the window (and legacy failed
// rows without expiresAt) stay failed and are no longer scanned.
const getScannableDraftDonations = async () => {
  const reconcileAfter = new Date(
    Date.now() - QR_FAILED_DRAFT_RECONCILIATION_WINDOW_MS,
  );
  return await DraftDonation.createQueryBuilder('draftDonation')
    .where('draftDonation.isQRDonation = true')
    .andWhere(
      `(draftDonation.status = :pendingStatus OR
        (draftDonation.status = :failedStatus AND
         draftDonation.expiresAt > :reconcileAfter))`,
      {
        pendingStatus: DRAFT_DONATION_STATUS.PENDING,
        failedStatus: DRAFT_DONATION_STATUS.FAILED,
        reconcileAfter,
      },
    )
    .getMany();
};

const getToken = async (
  chainType: string,
  symbol: string,
): Promise<Token | null> => {
  return await Token.createQueryBuilder('token')
    .where('token.chainType = :chainType', { chainType })
    .andWhere('token.isQR = true')
    .andWhere('token.symbol = :symbol', { symbol })
    .getOne();
};

// Check for transactions
export async function checkTransactions(
  donation: DraftDonation,
  source: string = 'stellar-cron',
): Promise<void> {
  const { toWalletAddress, amount, toWalletMemo, expiresAt, id } = donation;

  try {
    if (!toWalletAddress || !amount) {
      logger.debug(`Missing required fields for donation ID ${donation.id}`);
      return;
    }

    // A draft that already points to a live donation only needs its status
    // reconciled with that donation. When the referenced donation failed or
    // was deleted, keep going: a retry payment may still match, and the
    // expiry check below can fail the draft.
    if (donation.matchedDonationId) {
      const liveDonation = await reconcileDraftWithMatchedDonation(
        donation,
        source,
      );
      if (liveDonation) return;
    }

    const now = Date.now();
    // A missing expiresAt (legacy rows) counts as already expired.
    const expiresAtDate = expiresAt
      ? new Date(expiresAt).getTime() + DRAFT_DONATION_EXPIRY_GRACE_MS
      : 0;
    // An expired draft still gets this (last) scan, so a payment that arrived
    // within the validity window is matched even when the cron lagged behind.
    // If no such payment is found it is failed below, via a conditional
    // update that never overwrites a concurrent match.
    const isExpired = now > expiresAtDate;

    const response = await axios.get(
      `${STELLAR_HORIZON_API}/accounts/${toWalletAddress}/payments?limit=200&order=desc&join=transactions&include_failed=true`,
      { timeout: HORIZON_REQUEST_TIMEOUT_MS },
    );

    const transactions = response.data._embedded.records || [];

    // Only consider payments made at/after this draft was created (with a small
    // clock-skew allowance). The memo + amount already uniquely identify the
    // donation, so we match across the whole draft lifetime instead of a narrow
    // 2-minute window — otherwise a valid payment is lost whenever the cron
    // doesn't inspect it within 120s (e.g. when the jobs worker lags).
    const CLOCK_SKEW = 60 * 1000;
    const draftCreatedAt = new Date(donation.createdAt).getTime();

    for (const transaction of transactions) {
      const transactionCreatedAt = new Date(transaction.created_at).getTime();

      const isNativePayment =
        transaction.asset_type === 'native' &&
        transaction.type === 'payment' &&
        transaction.to === toWalletAddress &&
        Number(transaction.amount) === amount;

      const isCreateAccount =
        transaction.type === 'create_account' &&
        transaction.account === toWalletAddress &&
        Number(transaction.starting_balance) === amount;

      // The payment must fall inside the draft's validity window: not before
      // creation (minus clock skew) and not after expiry (plus the same grace
      // minute the expiry check uses).
      const isMatchingTransaction =
        (isNativePayment || isCreateAccount) &&
        transactionCreatedAt >= draftCreatedAt - CLOCK_SKEW &&
        transactionCreatedAt <= expiresAtDate;

      if (isMatchingTransaction) {
        const memo = transaction.transaction.memo;

        if (transaction.type === 'payment') {
          if (toWalletMemo) {
            if (memo !== toWalletMemo) {
              logger.debug(
                `Transaction memo does not match donation memo for donation ID ${donation.id}`,
              );
              // Skip this payment and keep scanning: another donation to the
              // same address may carry a different memo. Bailing here (return)
              // would abandon the search before reaching this donation's payment.
              continue;
            }
          } else if (memo !== id.toString()) {
            logger.debug(
              `Transaction memo does not match draft id for donation ID ${donation.id}`,
            );
            continue;
          }
        }

        const txHash = transaction.transaction_hash?.toLowerCase();
        if (!txHash) {
          // A payment without a transaction hash can neither be deduplicated
          // nor recorded as a donation. Skip it and keep scanning, so other
          // payments and the expiry handling below stay reachable.
          logger.debug(
            `Skipping payment without transaction hash for draft donation ID ${donation.id}`,
          );
          continue;
        }
        let createdDonationId: number | undefined;

        const matchUnderLocks = async () => {
          // Re-check under the locks: another execution may have already
          // created the donation for this transaction. Reconcile the draft
          // with it only when the donation is positively this draft's: other
          // pending drafts to the same project can share address, memo and
          // amount, and a donation already claimed by another draft must not
          // be claimed here too.
          const existingDonation = await findDonationsByTransactionId(txHash);
          if (existingDonation) {
            const claimingDraft = await findDraftDonationByMatchedDonationId(
              existingDonation.id,
            );
            if (
              (!claimingDraft || claimingDraft.id === donation.id) &&
              existingDonation.toWalletAddress === donation.toWalletAddress &&
              Number(existingDonation.amount) === amount
            ) {
              await reconcileDraftWithMatchedDonation(donation, source, {
                donation: existingDonation,
                linkFailedDonation: true,
              });
            }
            return;
          }

          // Re-read the draft under the lock; the in-memory entity may be
          // stale if another execution matched it meanwhile. A draft linked
          // to a failed donation may still be re-matched by a retry payment.
          const freshDraft = await DraftDonation.findOne({
            where: { id: donation.id },
          });
          if (
            !freshDraft ||
            freshDraft.status === DRAFT_DONATION_STATUS.MATCHED
          ) {
            return;
          }
          if (freshDraft.matchedDonationId) {
            const linkedDonation = await findDonationById(
              freshDraft.matchedDonationId,
            );
            if (
              linkedDonation &&
              linkedDonation.status !== DONATION_STATUS.FAILED
            ) {
              return;
            }
          }

          // Retrieve token object
          const token = await getToken('STELLAR', 'XLM');
          if (!token) {
            logger.debug('Token not found for donation ID', donation.id);
            return;
          }

          // Retrieve project object
          const project = await findProjectById(donation.projectId);
          if (!project) {
            logger.debug(`Project not found for donation ID ${donation.id}`);
            return;
          }

          // Get token price
          const tokenPrice = await new CoingeckoPriceAdapter().getTokenPrice({
            symbol: token.coingeckoId,
            networkId: token.networkId,
          });

          // Retrieve donor object
          const donor = await findUserById(donation.userId);

          // Use QF round from draft donation if available, otherwise fall back to smart select
          let qfRound: QfRound | undefined;
          if (donation.qfRoundId) {
            // Use the QF round specified in the draft donation - this should always be respected
            const foundQfRound = await QfRound.findOneBy({
              id: donation.qfRoundId,
            });
            if (foundQfRound) {
              qfRound = foundQfRound;
              logger.debug(
                `Using QF round ID ${donation.qfRoundId} from draft donation for QR donation ID ${donation.id}`,
              );
            } else {
              logger.warn(
                `QF round with ID ${donation.qfRoundId} not found for QR donation ID ${donation.id}, falling back to smart select`,
              );
              // Only fall back to smart select if the specified QF round doesn't exist
              try {
                const smartSelectedQfRound = await selectQfRoundForProject(
                  token.networkId,
                  project.id,
                );

                // Find the actual QfRound entity to assign to the donation
                qfRound =
                  (await QfRound.findOneBy({
                    id: smartSelectedQfRound.qfRoundId,
                  })) || undefined;
              } catch (error) {
                // If smart select fails (no eligible QF rounds), fall back to the old logic
                if (error instanceof QfRoundSmartSelectError) {
                  logger.debug(
                    `Smart select failed for QR donation, falling back to old logic: ${error.message}`,
                    {
                      projectId: project.id,
                      networkId: token.networkId,
                      draftDonationId: donation.id,
                    },
                  );

                  const activeQfRoundForProject =
                    await relatedActiveQfRoundForProject(project.id);

                  if (
                    activeQfRoundForProject &&
                    activeQfRoundForProject.isEligibleNetwork(token.networkId)
                  ) {
                    qfRound = activeQfRoundForProject;
                  }
                }
              }
            }
          } else {
            // Fall back to smart select logic if no QF round specified in draft donation
            try {
              const smartSelectedQfRound = await selectQfRoundForProject(
                token.networkId,
                project.id,
              );

              // Find the actual QfRound entity to assign to the donation
              qfRound =
                (await QfRound.findOneBy({
                  id: smartSelectedQfRound.qfRoundId,
                })) || undefined;
            } catch (error) {
              // If smart select fails (no eligible QF rounds), fall back to the old logic
              if (error instanceof QfRoundSmartSelectError) {
                logger.debug(
                  `Smart select failed for QR donation, falling back to old logic: ${error.message}`,
                  {
                    projectId: project.id,
                    networkId: token.networkId,
                    draftDonationId: donation.id,
                  },
                );

                const activeQfRoundForProject =
                  await relatedActiveQfRoundForProject(project.id);

                if (
                  activeQfRoundForProject &&
                  activeQfRoundForProject.isEligibleNetwork(token.networkId)
                ) {
                  qfRound = activeQfRoundForProject;
                }
              }
            }
          }

          const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
            await calculateGivbackFactor(project.id);

          const returnedDonation = await createDonation({
            amount: donation.amount,
            project,
            transactionNetworkId: donation.networkId,
            fromWalletAddress: transaction.source_account,
            transactionId: transaction.transaction_hash,
            tokenAddress: donation.tokenAddress,
            isProjectGivbackEligible: project.isGivbackEligible,
            donorUser: donor,
            isTokenEligibleForGivback: token.isGivbackEligible,
            segmentNotified: false,
            toWalletAddress: donation.toWalletAddress,
            donationAnonymous: false,
            transakId: '',
            token: donation.currency,
            valueUsd: donation.amount * tokenPrice,
            priceUsd: tokenPrice,
            status: transaction.transaction_successful ? 'verified' : 'failed',
            isQRDonation: true,
            toWalletMemo,
            qfRound,
            chainType: token.chainType,
            givbackFactor,
            projectRank,
            bottomRankInRound,
            powerRound,
          });

          if (!returnedDonation) {
            logger.debug(
              `Error creating donation for draft donation ID ${donation.id}`,
            );
            return;
          }

          // Update draft donation status to matched and add matched donation ID with source address
          await updateDraftDonationStatus({
            donationId: donation.id,
            status: transaction.transaction_successful
              ? DRAFT_DONATION_STATUS.MATCHED
              : DRAFT_DONATION_STATUS.FAILED,
            fromWalletAddress: transaction.source_account,
            matchedDonationId: returnedDonation.id,
            txHash,
            source,
          });

          createdDonationId = returnedDonation.id;
        };

        // Serialize the match across processes at two levels, always in this
        // order (tx lock outer, draft lock inner — a fixed order plus bounded
        // waits means no deadlock):
        // - per transaction: two different drafts sharing address, memo and
        //   amount must not both turn this payment into a donation;
        // - per draft: overlapping cron runs and concurrent GraphQL
        //   verifications must not match this draft twice.
        await withQrAdvisoryLock(
          QR_TX_LOCK_NAMESPACE,
          txHashToLockId(txHash),
          QR_DRAFT_LOCK_WAIT_MS,
          async () => {
            await withQrAdvisoryLock(
              QR_DRAFT_DONATION_LOCK_NAMESPACE,
              donation.id,
              QR_DRAFT_LOCK_WAIT_MS,
              matchUnderLocks,
            );
          },
        );

        // Outside the advisory locks: slow external calls that don't touch
        // lock-protected draft state must not extend the lock hold time.
        if (createdDonationId) {
          await syncDonationStatusWithBlockchainNetwork({
            donationId: createdDonationId,
          });

          // Notify clients of new donation
          notifyClients({
            type: 'new-donation',
            data: {
              donationId: createdDonationId,
              draftDonationId: donation.id,
            },
          });
        }

        return;
      }
    }

    if (isExpired && donation.status !== DRAFT_DONATION_STATUS.FAILED) {
      logger.debug(`Donation ID ${id} has expired. Updating status to failed`);
      // Conditional update: only fails the draft when it is still pending,
      // has no matched donation, and its expiresAt (as stored right now, not
      // as loaded by this possibly stale execution) is really in the past.
      await updateDraftDonationStatus({
        donationId: id,
        status: DRAFT_DONATION_STATUS.FAILED,
        expiresBefore: new Date(now - DRAFT_DONATION_EXPIRY_GRACE_MS),
        source,
      });
    }
  } catch (error) {
    logger.debug(
      `Error checking transactions for donation ID ${donation.id}:`,
      error,
    );
  }
}

// Processes all pending QR drafts under a no-overlap advisory lock, so a
// slow run can never race a newer one (in this process or in another
// container) with stale in-memory draft entities.
export const processPendingQRDraftDonations = async (): Promise<void> => {
  try {
    const acquired = await withQrAdvisoryLock(
      QR_DRAFT_DONATION_LOCK_NAMESPACE,
      QR_CRON_RUN_LOCK_ID,
      0,
      async () => {
        const scannableDonations = await getScannableDraftDonations();

        for (const donation of scannableDonations) {
          await checkTransactions(donation, 'stellar-cron');
        }
      },
    );
    if (!acquired) {
      // info (not debug) on purpose: if this line appears on every tick, the
      // run lock is stuck (e.g. an unlock failed on a still-alive connection)
      // and the cron is being starved.
      logger.info(
        'checkQRTransactionJob skipped, another execution is still running',
      );
    }
  } catch (e) {
    logger.error(`Error in processPendingQRDraftDonations: ${e.message}`);
  }
};

// Cron job to check pending draft donations every 5 minutes
export const runCheckQRTransactionJob = () => {
  logger.debug('checkQRTransactionJob() has been called', { cronJobTime });

  schedule(cronJobTime, async () => {
    await processPendingQRDraftDonations();
  });
};
