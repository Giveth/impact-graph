import axios from 'axios';
import { logger } from '../../utils/logger';

/**
 * impact-graph#2348 — keep v5 data flowing to v6-claimed Ortto contacts without
 * directly changing their identity.
 *
 * giveth-v6-core claims a person's Ortto contact once they have a verified v6
 * profile (giveth-v6-core#486), stamps it with `bol:cm:sourced-from-v6`, and
 * from then on owns its identity: the address (v6's canonical email), the
 * name, the marker and the subscription state. v5 keeps writing to the same
 * contact while it runs, and its activity data — round tags, donation stats —
 * is still wanted there. Its identity data is not: a v5 profile email written
 * back onto a claimed contact would silently undo v6's canonical address. A
 * genuine v5 email change still lands, by another route: the legacy data
 * bridge copies it into the v6 profile, and v6 re-points the contact.
 *
 * So before v5 writes, it asks Ortto which of the contacts it is about to
 * touch carry the marker, and strips the identity fields from those. Contacts
 * without the marker are written exactly as before.
 */

// The durable marker giveth-v6-core stamps on every contact it has claimed.
export const V6_SOURCED_MARKER = 'bol:cm:sourced-from-v6';

// A contact's identity fields: v6 owns these on a claimed contact.
const IDENTITY_FIELDS = ['str::email', 'str::first', 'str::last'];

// How many merge-key values one lookup asks Ortto about.
const LOOKUP_BATCH_SIZE = 50;
// Ortto's largest person/get page.
const LOOKUP_PAGE_LIMIT = 500;

export interface OrttoPersonPayload {
  fields: Record<string, unknown>;
  tags: string[];
  unset_tags: string[];
}

interface OrttoPersonGetResponse {
  contacts?: { fields?: Record<string, unknown> }[];
  has_more?: boolean;
  next_offset?: number;
}

export type OrttoPersonGetRequest = (
  body: Record<string, unknown>,
) => Promise<OrttoPersonGetResponse>;

// Emails are compared case-insensitively; every other key verbatim.
const normalizeKey = (mergeKey: string, value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const key = String(value);
  return mergeKey === 'str::email' ? key.trim().toLowerCase() : key;
};

// `ORTTO_PERSON_GET_API` when set; otherwise person/get on the host v5 already
// merges people through (`ORTTO_PERSON_API`).
export const resolveOrttoPersonGetUrl = (): string | undefined => {
  if (process.env.ORTTO_PERSON_GET_API) {
    return process.env.ORTTO_PERSON_GET_API;
  }
  if (!process.env.ORTTO_PERSON_API) return undefined;
  try {
    return new URL('/v1/person/get', process.env.ORTTO_PERSON_API).toString();
  } catch {
    return undefined;
  }
};

const requestOrttoPersonGet: OrttoPersonGetRequest = async body => {
  const url = resolveOrttoPersonGetUrl();
  if (!url) throw new Error('No Ortto person-get URL configured');
  const response = await axios.request({
    method: 'post',
    url,
    headers: {
      'X-Api-Key': process.env.ORTTO_API_KEY as string,
      'Content-Type': 'application/json',
    },
    timeout: 10_000,
    data: body,
  });
  return response.data;
};

/**
 * The merge-key values (of `values`) whose Ortto contact carries v6's marker,
 * or `undefined` when Ortto could not be asked — the caller then treats every
 * contact as claimed, since overwriting v6's identity is the worse failure.
 */
export const findV6ClaimedKeys = async (
  mergeKey: string,
  values: unknown[],
  request: OrttoPersonGetRequest = requestOrttoPersonGet,
): Promise<Set<string> | undefined> => {
  const keys = [
    ...new Set(
      values
        .map(value => normalizeKey(mergeKey, value))
        .filter((key): key is string => key !== undefined),
    ),
  ];
  const claimed = new Set<string>();
  try {
    for (let i = 0; i < keys.length; i += LOOKUP_BATCH_SIZE) {
      const batch = keys.slice(i, i + LOOKUP_BATCH_SIZE);
      const conditions = batch.map(value => ({
        '$str::is': { field_id: mergeKey, value },
      }));
      let offset = 0;
      for (;;) {
        const page = await request({
          limit: LOOKUP_PAGE_LIMIT,
          offset,
          fields: [mergeKey, V6_SOURCED_MARKER],
          filter: conditions.length === 1 ? conditions[0] : { $or: conditions },
        });
        for (const contact of page?.contacts ?? []) {
          if (contact?.fields?.[V6_SOURCED_MARKER] !== true) continue;
          const key = normalizeKey(mergeKey, contact.fields[mergeKey]);
          if (key !== undefined) claimed.add(key);
        }
        if (!page?.has_more || typeof page.next_offset !== 'number') break;
        offset = page.next_offset;
      }
    }
    return claimed;
  } catch (e) {
    logger.error('findV6ClaimedKeys >> error', {
      mergeKey,
      status: axios.isAxiosError(e) ? e.response?.status : undefined,
      message: e instanceof Error ? e.message : String(e),
    });
    return undefined;
  }
};

/**
 * Split v5's people into those written exactly as before and those whose
 * contact v6 has claimed, with the identity fields stripped from the latter.
 * The merge key itself is kept even when it is an identity field (outside
 * production v5 merges by email): it only finds the contact, and cannot change
 * it. `claimedKeys` undefined (the lookup failed) counts every person with a
 * merge key as claimed.
 */
export const splitPeopleByV6Claim = (
  people: OrttoPersonPayload[],
  mergeKey: string,
  claimedKeys: Set<string> | undefined,
): { unclaimed: OrttoPersonPayload[]; claimed: OrttoPersonPayload[] } => {
  const unclaimed: OrttoPersonPayload[] = [];
  const claimed: OrttoPersonPayload[] = [];
  for (const person of people) {
    const key = normalizeKey(mergeKey, person.fields[mergeKey]);
    if (key === undefined || (claimedKeys && !claimedKeys.has(key))) {
      unclaimed.push(person);
      continue;
    }
    const fields = { ...person.fields };
    for (const fieldId of IDENTITY_FIELDS) {
      if (fieldId !== mergeKey) delete fields[fieldId];
    }
    claimed.push({ ...person, fields });
  }
  return { unclaimed, claimed };
};
