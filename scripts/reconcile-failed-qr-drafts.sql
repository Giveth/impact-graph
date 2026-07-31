-- One-off data repair for Stellar QR draft donations that were overwritten to
-- 'failed' by the cron race fixed in fix/stellar-draft-race-conditions
-- (see https://github.com/Giveth/giveth-v6-core/issues/444, staging draft 2271).
--
-- Runtime reconciliation (reconcileDraftWithMatchedDonation) treats every
-- non-failed donation as live — 'verified', 'pending' and 'swapPending' alike
-- — so this script uses the same rule: a failed draft referencing any
-- non-failed donation is repaired to 'matched'. Drafts referencing a
-- genuinely failed donation are never touched.
--
-- The whole script runs in a single transaction and the inspection SELECT
-- locks the affected draft and donation rows (FOR UPDATE OF d, dn), so a
-- concurrent status transition (e.g. the blockchain sync job failing a
-- donation) cannot slip in between inspection and repair and leave a matched
-- draft referencing a failed donation.
--
-- The script is idempotent: repaired rows have status = 'matched' and no
-- longer match the WHERE clause on a second run. Historical failed drafts
-- outside the cron's reconciliation window only self-heal when the donor
-- revisits the donation page, so run this once on staging/production
-- alongside the deploy.

BEGIN;

-- 1) Inspect the affected rows, locking them for the repair below:
SELECT
  d.id AS draft_id,
  d.status AS draft_status,
  d."matchedDonationId",
  d."fromWalletAddress" AS draft_from,
  dn.status AS donation_status,
  dn."transactionId",
  dn."createdAt" AS donation_created_at
FROM draft_donation d
JOIN donation dn ON dn.id = d."matchedDonationId"
WHERE d."isQRDonation" = true
  AND d.status = 'failed'
  AND dn.status != 'failed'
FOR UPDATE OF d, dn;

-- 2) Repair: a failed QR draft that references a non-failed donation is a
--    successful donation. Also backfill fromWalletAddress from the donation,
--    but only when the draft's value is null or empty. The donation rows are
--    locked by the SELECT above, so dn.status here is the locked state.
UPDATE draft_donation d
SET
  status = 'matched',
  "fromWalletAddress" = CASE
    WHEN COALESCE(d."fromWalletAddress", '') = '' THEN dn."fromWalletAddress"
    ELSE d."fromWalletAddress"
  END
FROM donation dn
WHERE dn.id = d."matchedDonationId"
  AND d."isQRDonation" = true
  AND d.status = 'failed'
  AND dn.status != 'failed';

COMMIT;
