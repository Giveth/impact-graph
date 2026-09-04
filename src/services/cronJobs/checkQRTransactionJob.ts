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
import { redis } from '../../redis';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { CoingeckoPriceAdapter } from '../../adapters/price/CoingeckoPriceAdapter';
import { findUserById } from '../../repositories/userRepository';
import { selectQfRoundForProjectWithFallback } from '../qfRoundSmartSelectService';
import { QfRound } from '../../entities/qfRound';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';
import { notifyClients } from '../sse/sse';
import { calculateGivbackFactor } from '../givbackService';
import {
  isNativeStellarDeposit,
  stellarOperationAmount,
} from '../chains/stellar/stellarOperations';

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
// Redis lease guarding a whole cron run against routine overlap. This is an
// efficiency guard only — correctness always comes from the per-transaction/
// per-draft advisory locks plus the guarded status updates. A lease (instead
// of a pg session advisory lock) because session-scoped locks are unreliable
// behind a transaction-mode pooler (PgBouncer/DO, see src/orm.ts), and it
// self-heals: if a runner dies mid-run the key simply expires.
export const QR_CRON_RUN_LOCK_KEY = 'checkQRTransactionJob:run-lock';
// A run longer than this may overlap the next tick, which is safe (see
// above); a crashed runner blocks the cron for at most this long.
const QR_CRON_RUN_LEASE_TTL_MS = 10 * 60 * 1000;
// Delete-if-owner, atomically: never release a lease that has expired and
// been re-acquired by another runner.
const RELEASE_QR_CRON_RUN_LEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
// One minute of grace after expiresAt during which a payment is still
// accepted and the draft is not yet failed. Shared with the resolver so the
// read path can never fail a draft the matcher would still accept.
export const DRAFT_DONATION_EXPIRY_GRACE_MS = 60 * 1000;
// A failed QR draft stays eligible for transaction scanning this long after
// its expiry, so a payment Horizon indexed late (after the frontend timed
// the draft out via markDraftDonationAsFailed) can still be reconciled to
// matched. Bounded so failed drafts are not Horizon-scanned forever.
// NOTE: the CASE 1 payment-acceptance window below is derived from this
// value — tuning this constant changes both scanning cost and which late
// payments are accepted.
export const QR_FAILED_DRAFT_RECONCILIATION_WINDOW_MS = 30 * 60 * 1000;
// How long after expiry (plus grace) a memo-identified (CASE 1, see
// checkTransactions) payment is still accepted. Deliberately the same span
// as the reconciliation window: the cron stops scanning a draft when that
// window closes, so a longer acceptance window would be unreachable there —
// but verifyQRDonationTransaction has no scannability filter, so this bound
// is what limits late matches on the user-triggered verify path.
export const QR_LATE_PAYMENT_ACCEPTANCE_WINDOW_MS =
  QR_FAILED_DRAFT_RECONCILIATION_WINDOW_MS;
// How long a matcher waits for another execution's per-draft or per-tx lock,
// and the cap on any single Horizon request. Bounded so a hung execution can
// only delay a draft, never pin connections or wedge the cron indefinitely.
const QR_DRAFT_LOCK_WAIT_MS = 30 * 1000;
const HORIZON_REQUEST_TIMEOUT_MS = 30 * 1000;

// DraftDonation.amount and Donation.amount are Postgres `real` (float4)
// columns, so an amount with more than float4's ~7 significant digits reads
// back as a slightly different double than the exact on-chain value. Compare
// amounts at float4 precision so a donor's exact payment still matches such
// a draft.
const amountsMatchAtFloat4Precision = (a: number, b: number): boolean =>
  Math.fround(a) === Math.fround(b);

// Only the cron waits for a contended lock: it is a single sequential runner,
// and waiting lets it finish a draft this tick. The public
// verifyQRDonationTransaction query must never wait — each waiter holds a
// pooled connection inside an open transaction, so a burst of concurrent
// verifications would exhaust the connection pool (src/orm.ts) and stall
// unrelated queries. Skipping costs a verification nothing: the caller polls
// again, and the cron retries the draft regardless.
const lockWaitMsForSource = (source: string): number =>
  source === 'stellar-cron' ? QR_DRAFT_LOCK_WAIT_MS : 0;
// How often the lock-carrying transaction runs a no-op, so it is never idle
// long enough for the server or the pooler to end it (see withQrXactLocks).
const QR_LOCK_HEARTBEAT_INTERVAL_MS = 5 * 1000;

// Deterministic 32-bit advisory-lock key for a Stellar transaction hash
// (first 8 hex chars as a signed int32). A collision between two different
// hashes only causes unnecessary serialization, never a correctness issue.
export function txHashToLockId(txHash: string): number {
  return (parseInt(txHash.slice(0, 8), 16) || 0) | 0;
}

// Runs fn while holding transaction-scoped PostgreSQL advisory locks
// (pg_try_advisory_xact_lock inside one explicit transaction), which stay
// correct behind a transaction-mode pooler (PgBouncer/DO, see src/orm.ts):
// the open transaction pins all statements to one backend, and the locks are
// released by that same backend at commit/rollback — a crashed or timing-out
// holder can never leak a lock the way a failed pg_advisory_unlock on a
// pooled session can. Locks are acquired strictly in the order given (the
// callers' fixed tx -> draft order), polled for at most waitMs total
// (0 = single attempt); on timeout the transaction is rolled back, which
// atomically releases any locks already acquired, and fn is skipped
// (returns false). fn's own database work runs on ordinary pooled
// connections and commits independently; this transaction only carries the
// locks.
async function withQrXactLocks(
  locks: Array<{ namespace: number; lockId: number }>,
  waitMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const queryRunner = AppDataSource.getDataSource().createQueryRunner();
  await queryRunner.connect();
  try {
    await queryRunner.startTransaction();
    try {
      const deadline = Date.now() + waitMs;
      for (const lock of locks) {
        for (;;) {
          const result = await queryRunner.query(
            'SELECT pg_try_advisory_xact_lock($1, $2) as acquired',
            [lock.namespace, lock.lockId],
          );
          if (result?.[0]?.acquired) break;
          if (Date.now() >= deadline) {
            await queryRunner.rollbackTransaction();
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      // fn's own work runs on other connections, so without this the lock
      // transaction would sit idle-in-transaction for the whole critical
      // section — long enough for an idle_in_transaction_session_timeout (or a
      // pooler pruning idle backends) to end it and release the locks while fn
      // is still running. A cheap statement keeps the backend busy; failures
      // are ignored because the commit below reports a lost transaction.
      const heartbeat = setInterval(() => {
        queryRunner.query('SELECT 1').catch(() => undefined);
      }, QR_LOCK_HEARTBEAT_INTERVAL_MS);
      try {
        await fn();
      } finally {
        clearInterval(heartbeat);
      }
      await queryRunner.commitTransaction();
      return true;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  } finally {
    await queryRunner.release();
  }
}

// Single source of truth for aligning a draft with a donation (the one it
// references, or an explicitly provided one). Returns the donation when it is
// live (non-failed) — the draft is made MATCHED, including fromWalletAddress.
// Returns null when the donation is missing or failed: a pending draft is left
// untouched so callers can keep scanning for a retry payment or fail it via the
// guarded expiry update, while a draft still reported as matched is corrected
// to failed (its success is stale). With linkFailedDonation=true a failed
// donation is also recorded on the draft (status failed + matchedDonationId),
// used when a payment has just been attributed to the draft.
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
    // A draft already reported as matched must not keep showing success once
    // its donation has failed (it can fail on-chain long after the match, so
    // this read is the only place that notices). The guarded update only
    // permits matched -> failed when the donation genuinely failed.
    if (
      options.linkFailedDonation ||
      draftDonation.status === DRAFT_DONATION_STATUS.MATCHED
    ) {
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

// Everything a donation insert needs that does not depend on lock-protected
// state. Prepared before the advisory locks are taken, so slow externals
// (Coingecko price, givback factor) never extend the lock hold time.
interface QrDonationCreationContext {
  token: Token;
  project: Project;
  tokenPrice: number;
  donor: User | undefined;
  qfRound?: QfRound;
  givbackFactor?: number;
  projectRank?: number;
  bottomRankInRound?: number;
  powerRound?: number;
}

// Returns null when the environment cannot produce a donation at all
// (missing QR token or project) — callers should retry on a later tick
// rather than fail the draft on that evidence.
async function prepareQrDonationCreationContext(
  donation: DraftDonation,
): Promise<QrDonationCreationContext | null> {
  // Retrieve token object
  const token = await getToken('STELLAR', 'XLM');
  if (!token) {
    logger.debug('Token not found for donation ID', donation.id);
    return null;
  }

  // Retrieve project object
  const project = await findProjectById(donation.projectId);
  if (!project) {
    logger.debug(`Project not found for donation ID ${donation.id}`);
    return null;
  }

  // Get token price
  const tokenPrice = await new CoingeckoPriceAdapter().getTokenPrice({
    symbol: token.coingeckoId,
    networkId: token.networkId,
  });

  // Retrieve donor object
  const donor = (await findUserById(donation.userId)) || undefined;

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
      qfRound = await selectQfRoundForProjectWithFallback(
        token.networkId,
        project.id,
        { draftDonationId: donation.id },
      );
    }
  } else {
    // Fall back to smart select logic if no QF round specified in draft donation
    qfRound = await selectQfRoundForProjectWithFallback(
      token.networkId,
      project.id,
      { draftDonationId: donation.id },
    );
  }

  const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
    await calculateGivbackFactor(project.id);

  return {
    token,
    project,
    tokenPrice,
    donor,
    qfRound,
    givbackFactor,
    projectRank,
    bottomRankInRound,
    powerRound,
  };
}

// One Horizon page per account, optionally reused within a single run. Drafts
// for the same project share a toWalletAddress, so without the cache the
// identical 200-record page is fetched once per draft every tick. A payment
// that lands mid-run is simply picked up by the next tick.
async function fetchAccountPayments(
  toWalletAddress: string,
  paymentsByAddress?: Map<string, any[]>,
): Promise<any[]> {
  const cachedPayments = paymentsByAddress?.get(toWalletAddress);
  if (cachedPayments) return cachedPayments;

  const response = await axios.get(
    `${STELLAR_HORIZON_API}/accounts/${toWalletAddress}/payments?limit=200&order=desc&join=transactions&include_failed=true`,
    { timeout: HORIZON_REQUEST_TIMEOUT_MS },
  );
  const payments = response.data._embedded.records || [];
  paymentsByAddress?.set(toWalletAddress, payments);
  return payments;
}

// Check for transactions
export async function checkTransactions(
  donation: DraftDonation,
  source: string = 'stellar-cron',
  paymentsByAddress?: Map<string, any[]>,
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

    const transactions = await fetchAccountPayments(
      toWalletAddress,
      paymentsByAddress,
    );

    // Only consider payments made at/after this draft was created (with a small
    // clock-skew allowance). The memo + amount already uniquely identify the
    // donation, so we match across the whole draft lifetime instead of a narrow
    // 2-minute window — otherwise a valid payment is lost whenever the cron
    // doesn't inspect it within 120s (e.g. when the jobs worker lags).
    const CLOCK_SKEW = 60 * 1000;
    const draftCreatedAt = new Date(donation.createdAt).getTime();

    // Two matching regimes, depending on whether the recipient address
    // requires its own memo (toWalletMemo). This block is the single source
    // of truth for the regime; the identification pass, the candidate
    // ordering, and the under-lock re-check below all point back here.
    // - CASE 1 (no recipient memo): the Stellar memo carries this draft's
    //   unique id, so memo + destination identify the payment — for every
    //   operation type, create_account included. The amount is whatever
    //   actually arrived (exchanges like Binance deduct their withdrawal fee
    //   before broadcasting), and because the memo identifies the draft, a
    //   payment broadcast after expiry stays acceptable for
    //   QR_LATE_PAYMENT_ACCEPTANCE_WINDOW_MS.
    // - CASE 2 (recipient requires its own memo): several drafts to the same
    //   project can share destination and memo, so the draft amount remains
    //   the only disambiguator (compared at float4 precision, the column
    //   type) and the validity window stays tight: without a unique
    //   identifier a late payment must not be guessed at. create_account has
    //   no memo to distinguish it with, so it keeps amount-only matching.
    // Known limitation, accepted with issue #2347: CASE 1 deliberately has
    // no amount condition — an exact, tolerance or minimum-amount rule would
    // reject legitimately fee-reduced payments. Because the memo is the
    // draft's sequential id (public via the QR and enumerable), a third
    // party can send a dust payment carrying a pending draft's memo. The
    // candidate ordering below picks the real payment whenever both are on
    // the Horizon page, but a dust payment scanned on a tick before the real
    // one exists still claims the draft, and the real payment then needs
    // manual reconciliation. Fully closing this needs a product change — an
    // unguessable memo token instead of the draft id, or crediting every
    // memo-matching payment — not a matching-rule tweak.
    // Known limitation (pre-existing): donations are keyed by transaction
    // hash, so one exchange batch transaction carrying payments for TWO
    // CASE 2 drafts (same address and memo, different amounts) can only ever
    // credit one of them — the second draft skips the already-claimed hash
    // until it fails at expiry. Crediting both needs per-(hash, operation)
    // donation keying, a schema/product decision.
    const requiresRecipientMemo = Boolean(toWalletMemo);
    const paymentWindowEndMs = requiresRecipientMemo
      ? expiresAtDate
      : expiresAtDate + QR_LATE_PAYMENT_ACCEPTANCE_WINDOW_MS;

    // Prepared at most once per draft (it depends only on the draft), so a
    // payment that turns out to belong to another draft does not repeat the
    // Coingecko price call and the token/project/user/QF-round queries.
    let preparedContext: QrDonationCreationContext | null = null;
    // Set when a matching payment could not be turned into a donation for
    // reasons outside this draft (missing configuration, lock contention, a
    // failed insert). Scanning stops for this tick; see the handling below.
    let abortReason: string | undefined;

    // First pass — identification only, pure and in-memory: which operations
    // on the page belong to this draft at all (operation shape, destination,
    // validity window, memo). The matching flow below then runs over these
    // candidates only.
    const candidates: { transaction: any; opAmount: number }[] = [];
    for (const transaction of transactions) {
      const transactionCreatedAt = new Date(transaction.created_at).getTime();
      // What this operation transferred on-chain — the one number the amount
      // check, the ranking, and the recorded donation amount all judge.
      // (isNativeStellarDeposit guarantees it is finite for candidates.)
      const opAmount = stellarOperationAmount(transaction);

      // CASE 1 waives the amount for every operation type (identification is
      // the memo check below); CASE 2 requires the draft amount.
      const amountMatches =
        !requiresRecipientMemo ||
        amountsMatchAtFloat4Precision(opAmount, amount);

      // Validity window: not before creation (minus clock skew) and not
      // after the case-dependent end (see paymentWindowEndMs above).
      const isMatchingTransaction =
        isNativeStellarDeposit(transaction, toWalletAddress) &&
        amountMatches &&
        transactionCreatedAt >= draftCreatedAt - CLOCK_SKEW &&
        transactionCreatedAt <= paymentWindowEndMs;

      if (!isMatchingTransaction) continue;

      const memo = transaction.transaction?.memo;
      if (requiresRecipientMemo) {
        // CASE 2: payments must carry the recipient's own memo
        // (create_account has none to check — see the regime notes above).
        if (transaction.type === 'payment' && memo !== toWalletMemo) {
          logger.debug(
            `Transaction memo does not match donation memo for donation ID ${donation.id}`,
          );
          continue;
        }
      } else if (memo !== id.toString()) {
        // CASE 1: every operation type must name this very draft — including
        // create_account, which historically matched on exact amount with no
        // memo at all. That memo-less acceptance path was removed with issue
        // #2347 (once the amount condition is waived, a memo-less rule would
        // accept any deposit): a donor funding a fresh address without a
        // memo now needs manual reconciliation. Not logged: with no amount
        // prefilter, every other payment on a shared address takes this
        // branch on every tick — expected, not an event.
        continue;
      }

      // A record without a transaction hash can neither be deduplicated nor
      // recorded as a donation.
      if (!transaction.transaction_hash) {
        logger.debug(
          `Skipping malformed payment record for draft donation ID ${donation.id}`,
        );
        continue;
      }

      candidates.push({ transaction, opAmount });
    }

    // Several payments can identify the same draft — in CASE 1 anyone can
    // send a payment carrying its memo — so order the attempts: successful
    // transactions before failed ones (a donor's failed full-amount attempt
    // must not outrank their successful retry), then by on-chain amount,
    // largest first, so a dust payment cannot outrank the real one when both
    // are already on the page (see the limitation note above). Ordering
    // never rejects a payment; ties keep Horizon's newest-first order
    // (Array.prototype.sort is stable), so CASE 2 — where every candidate
    // equals the draft amount — behaves as before.
    candidates.sort(
      (a, b) =>
        Number(Boolean(b.transaction.transaction_successful)) -
          Number(Boolean(a.transaction.transaction_successful)) ||
        b.opAmount - a.opAmount,
    );

    // One attempt per transaction: sibling operations of a multi-op tx share
    // the hash, and the match verdict depends only on the hash, so only the
    // best-ranked operation per transaction is worth the lock cycle.
    const seenTxHashes = new Set<string>();
    const rankedCandidates = candidates.filter(candidate => {
      const hash = candidate.transaction.transaction_hash.toLowerCase();
      if (seenTxHashes.has(hash)) return false;
      seenTxHashes.add(hash);
      return true;
    });

    // The donation records what the matched operation actually transferred
    // (opAmount), not the draft's requested amount (see the CASE 1 notes).
    for (const {
      transaction,
      opAmount: actualOnChainAmount,
    } of rankedCandidates) {
      const txHash = transaction.transaction_hash.toLowerCase();
      let createdDonationId: number | undefined;
      // What this payment amounted to for this draft:
      // - created: a donation was created and the draft updated — stop
      //   scanning and run the post-creation side effects.
      // - settled: the draft already references a live donation (or a
      //   concurrent execution matched it) — nothing left to do.
      // - skip: this payment cannot serve this draft (it belongs to
      //   another draft, or its donation mismatches) — keep trying the
      //   remaining candidates and leave the expiry handling below reachable.
      // - abort: environmental or lock failure (missing token/project,
      //   lock wait timeout, donation insert failure) — stop scanning
      //   without failing the draft; the next tick retries from scratch.
      // (an object property, not a let, so TypeScript doesn't narrow the
      // value across the lock closure that mutates it)
      const matchOutcome: {
        verdict: 'created' | 'settled' | 'skip' | 'abort';
      } = { verdict: 'abort' };

      // Slow externals run before the locks so the critical section is
      // only the existence re-checks and the insert itself. This unlocked
      // existing-donation pre-check merely skips the preparation when the
      // donation obviously exists already; the authoritative check runs
      // under the locks below.
      let creationContext: QrDonationCreationContext | null = null;
      if (!(await findDonationsByTransactionId(txHash))) {
        if (!preparedContext) {
          preparedContext = await prepareQrDonationCreationContext(donation);
        }
        creationContext = preparedContext;
        // Missing token/project configuration: nothing can be created this
        // tick, and the draft must not be failed on that evidence alone.
        if (!creationContext) {
          abortReason =
            'QR donation configuration unavailable (missing token or project)';
          break;
        }
      }

      const matchUnderLocks = async () => {
        // Re-check under the locks: another execution may have already
        // created the donation for this transaction. Reconcile the draft
        // with it only when the donation is positively this draft's: a
        // donation already claimed by another draft must not be claimed
        // here too, and for CASE 2 the amount must also match, mirroring
        // the identification pass (see the CASE 1/CASE 2 notes above).
        const existingDonation = await findDonationsByTransactionId(txHash);
        if (existingDonation) {
          const claimingDraft = await findDraftDonationByMatchedDonationId(
            existingDonation.id,
          );
          if (
            (claimingDraft && claimingDraft.id !== donation.id) ||
            existingDonation.toWalletAddress !== donation.toWalletAddress ||
            (requiresRecipientMemo &&
              !amountsMatchAtFloat4Precision(
                Number(existingDonation.amount),
                amount,
              ))
          ) {
            // This payment is spoken for by another draft; another
            // candidate further down the list may still be this draft's own.
            matchOutcome.verdict = 'skip';
            return;
          }
          const liveDonation = await reconcileDraftWithMatchedDonation(
            donation,
            source,
            { donation: existingDonation, linkFailedDonation: true },
          );
          // When the linked donation failed on-chain, keep scanning: the
          // donor may have retried with another payment.
          matchOutcome.verdict = liveDonation ? 'settled' : 'skip';
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
          matchOutcome.verdict = 'settled';
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
            matchOutcome.verdict = 'settled';
            return;
          }
        }

        if (!creationContext) {
          // The unlocked pre-check saw a donation for this hash, but it is
          // gone now and nothing was prepared to create one. Leave the
          // 'abort' verdict: the next tick retries with a clean view.
          return;
        }

        const returnedDonation = await createDonation({
          amount: actualOnChainAmount,
          project: creationContext.project,
          transactionNetworkId: donation.networkId,
          fromWalletAddress: transaction.source_account,
          transactionId: transaction.transaction_hash,
          tokenAddress: donation.tokenAddress,
          isProjectGivbackEligible: creationContext.project.isGivbackEligible,
          donorUser: creationContext.donor,
          isTokenEligibleForGivback: creationContext.token.isGivbackEligible,
          segmentNotified: false,
          toWalletAddress: donation.toWalletAddress,
          donationAnonymous: false,
          transakId: '',
          token: donation.currency,
          valueUsd: actualOnChainAmount * creationContext.tokenPrice,
          priceUsd: creationContext.tokenPrice,
          status: transaction.transaction_successful ? 'verified' : 'failed',
          isQRDonation: true,
          toWalletMemo,
          qfRound: creationContext.qfRound,
          chainType: creationContext.token.chainType,
          givbackFactor: creationContext.givbackFactor,
          projectRank: creationContext.projectRank,
          bottomRankInRound: creationContext.bottomRankInRound,
          powerRound: creationContext.powerRound,
        });

        if (!returnedDonation) {
          // info, not debug: a real payment matched this draft but no
          // donation row could be created — that needs eyes in production.
          logger.info(
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
        matchOutcome.verdict = 'created';
      };

      // Serialize the match across processes at two levels, acquired in a
      // single lock transaction, always in this order (tx first, then
      // draft — a fixed order plus bounded try-lock polling means no
      // deadlock):
      // - per transaction: two different drafts sharing address, memo and
      //   amount must not both turn this payment into a donation;
      // - per draft: overlapping cron runs and concurrent GraphQL
      //   verifications must not match this draft twice.
      await withQrXactLocks(
        [
          {
            namespace: QR_TX_LOCK_NAMESPACE,
            lockId: txHashToLockId(txHash),
          },
          {
            namespace: QR_DRAFT_DONATION_LOCK_NAMESPACE,
            lockId: donation.id,
          },
        ],
        lockWaitMsForSource(source),
        matchUnderLocks,
      );

      // Outside the advisory locks: slow external calls that don't touch
      // lock-protected draft state must not extend the lock hold time.
      if (createdDonationId) {
        // Notify clients first: the donor's QR screen is waiting for this
        // event, it needs nothing from the sync below, and the sync can take
        // seconds (Horizon fetch, statistics, materialized-view refresh).
        notifyClients({
          type: 'new-donation',
          data: {
            donationId: createdDonationId,
            draftDonationId: donation.id,
          },
        });

        await syncDonationStatusWithBlockchainNetwork({
          donationId: createdDonationId,
        });
      }

      // Only 'skip' keeps trying remaining candidates (and leaves the expiry
      // handling below reachable): 'created' and 'settled' mean the draft
      // is resolved, 'abort' means the environment must recover before
      // anything is decided — see the abort handling below.
      if (matchOutcome.verdict === 'abort') {
        abortReason = 'no donation could be created for the matched payment';
        break;
      }
      if (matchOutcome.verdict !== 'skip') return;
    }

    if (abortReason) {
      // Retrying is right while a later tick may still succeed. But once the
      // draft is past the window in which scanning can still help it, retrying
      // forever would leave it pending until the hard delete, with the donor
      // never told anything — so give it a terminal status carrying the reason.
      if (now > expiresAtDate + QR_FAILED_DRAFT_RECONCILIATION_WINDOW_MS) {
        // info, not debug: a real payment matched and never became a donation.
        logger.info(
          `Failing QR draft donation ID ${id} after repeated match failures`,
          { abortReason, source },
        );
        await updateDraftDonationStatus({
          donationId: id,
          status: DRAFT_DONATION_STATUS.FAILED,
          expiresBefore: new Date(now - DRAFT_DONATION_EXPIRY_GRACE_MS),
          errorMessage: abortReason,
          source,
        });
      }
      return;
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

// Processes all scannable QR drafts under a no-overlap Redis lease, so a
// slow run does not routinely race a newer one (in this process or in
// another container) with stale in-memory draft entities. The lease is only
// an efficiency guard: even if two runs do overlap (e.g. after a lease
// expiry), the per-transaction/per-draft locks and the guarded status
// updates keep the outcome correct.
export const processPendingQRDraftDonations = async (): Promise<void> => {
  try {
    const leaseToken = `${process.pid}:${Date.now()}:${Math.random()}`;
    let leaseHeld = false;
    try {
      const acquired = await redis.set(
        QR_CRON_RUN_LOCK_KEY,
        leaseToken,
        'PX',
        QR_CRON_RUN_LEASE_TTL_MS,
        'NX',
      );
      if (acquired !== 'OK') {
        // A previous run is still going, or a crashed runner's lease has not
        // expired yet (self-heals within QR_CRON_RUN_LEASE_TTL_MS).
        logger.info(
          'checkQRTransactionJob skipped, another execution is still running',
        );
        return;
      }
      leaseHeld = true;
    } catch (e) {
      // The lease is an efficiency guard only, so a Redis outage must not stop
      // matching: drafts paid during the outage would otherwise age out of the
      // reconciliation window and stay failed with the payment on-chain.
      // Correctness still comes from the advisory locks and guarded updates.
      logger.error(
        `checkQRTransactionJob could not acquire its Redis lease, running without it: ${e.message}`,
      );
    }
    try {
      const scannableDonations = await getScannableDraftDonations();
      // Shared across this run only: drafts for one project reuse a single
      // Horizon page instead of re-fetching it per draft.
      const paymentsByAddress = new Map<string, any[]>();

      for (const donation of scannableDonations) {
        await checkTransactions(donation, 'stellar-cron', paymentsByAddress);
      }
    } finally {
      if (leaseHeld) {
        await redis.eval(
          RELEASE_QR_CRON_RUN_LEASE_SCRIPT,
          1,
          QR_CRON_RUN_LOCK_KEY,
          leaseToken,
        );
      }
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
