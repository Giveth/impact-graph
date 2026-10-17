import { assert } from 'chai';
import axios from 'axios';
import sinon from 'sinon';
import {
  findV6ClaimedKeys,
  OrttoPersonPayload,
  resolveOrttoPersonGetUrl,
  splitPeopleByV6Claim,
  V6_SOURCED_MARKER,
} from './orttoV6ClaimGuard';

const USER_ID = 'str:cm:user-id';
const EMAIL = 'str::email';

const v5Person = (userId: string, email: string): OrttoPersonPayload => ({
  fields: {
    'str::first': 'Ada',
    'str::last': 'Lovelace',
    'str::email': email,
    'str:cm:user-id': userId,
    'int:cm:number-of-donations': 3,
    'int:cm:total-donations-value': 12000,
  },
  tags: ['QF Donor Round 9', 'Donated on Gnosis'],
  unset_tags: ['QF Project Owner Round 8'],
});

describe('orttoV6ClaimGuard - findV6ClaimedKeys (impact-graph#2348)', () => {
  it('returns the keys whose contact carries the v6 marker', async () => {
    const bodies: Record<string, any>[] = [];
    const claimed = await findV6ClaimedKeys(
      USER_ID,
      ['1', '2', '3'],
      async body => {
        bodies.push(body);
        return {
          contacts: [
            { fields: { [USER_ID]: '1', [V6_SOURCED_MARKER]: true } },
            { fields: { [USER_ID]: '2', [V6_SOURCED_MARKER]: false } },
            { fields: { [USER_ID]: '3' } },
          ],
        };
      },
    );
    assert.deepEqual([...(claimed as Set<string>)], ['1']);
    assert.equal(bodies.length, 1);
    assert.deepEqual(bodies[0].fields, [USER_ID, V6_SOURCED_MARKER]);
    assert.deepEqual(bodies[0].filter, {
      $or: ['1', '2', '3'].map(value => ({
        '$str::is': { field_id: USER_ID, value },
      })),
    });
  });

  it('asks about a single key without an $or wrapper, and dedupes keys', async () => {
    const bodies: Record<string, any>[] = [];
    await findV6ClaimedKeys(USER_ID, ['7', '7', undefined, ''], async body => {
      bodies.push(body);
      return { contacts: [] };
    });
    assert.deepEqual(bodies[0].filter, {
      '$str::is': { field_id: USER_ID, value: '7' },
    });
  });

  it('compares emails case-insensitively', async () => {
    const claimed = await findV6ClaimedKeys(
      EMAIL,
      [' Ada@Example.com '],
      async () => ({
        contacts: [
          { fields: { [EMAIL]: 'ada@example.com', [V6_SOURCED_MARKER]: true } },
        ],
      }),
    );
    assert.isTrue(claimed?.has('ada@example.com'));
  });

  it('asks in batches of 50 and follows every page', async () => {
    const keys = Array.from({ length: 60 }, (_, i) => String(i + 1));
    const calls: { size: number; offset: number }[] = [];
    const claimed = await findV6ClaimedKeys(USER_ID, keys, async body => {
      const size = (body.filter as { $or: unknown[] }).$or.length;
      calls.push({ size, offset: body.offset as number });
      if (size === 50 && body.offset === 0) {
        return {
          contacts: [{ fields: { [USER_ID]: '1', [V6_SOURCED_MARKER]: true } }],
          has_more: true,
          next_offset: 500,
        };
      }
      if (size === 50) {
        return {
          contacts: [{ fields: { [USER_ID]: '2', [V6_SOURCED_MARKER]: true } }],
        };
      }
      return {
        contacts: [{ fields: { [USER_ID]: '60', [V6_SOURCED_MARKER]: true } }],
      };
    });
    assert.deepEqual(calls, [
      { size: 50, offset: 0 },
      { size: 50, offset: 500 },
      { size: 10, offset: 0 },
    ]);
    assert.deepEqual([...(claimed as Set<string>)].sort(), ['1', '2', '60']);
  });

  it('returns undefined when Ortto cannot be asked', async () => {
    const claimed = await findV6ClaimedKeys(USER_ID, ['1'], async () => {
      throw new Error('boom');
    });
    assert.isUndefined(claimed);
  });

  it('makes no request when there is nothing to ask about', async () => {
    let called = false;
    const claimed = await findV6ClaimedKeys(USER_ID, [undefined], async () => {
      called = true;
      return {};
    });
    assert.isFalse(called);
    assert.equal(claimed?.size, 0);
  });
});

describe('orttoV6ClaimGuard - splitPeopleByV6Claim (impact-graph#2348)', () => {
  it('AC1 + AC2: a claimed contact keeps stats and tags but loses email and name', () => {
    const person = v5Person('1', 'old@example.com');
    const { unclaimed, claimed } = splitPeopleByV6Claim(
      [person],
      USER_ID,
      new Set(['1']),
    );
    assert.deepEqual(unclaimed, []);
    assert.deepEqual(claimed, [
      {
        fields: {
          'str:cm:user-id': '1',
          'int:cm:number-of-donations': 3,
          'int:cm:total-donations-value': 12000,
        },
        tags: ['QF Donor Round 9', 'Donated on Gnosis'],
        unset_tags: ['QF Project Owner Round 8'],
      },
    ]);
    // The caller's object is not mutated.
    assert.equal(person.fields['str::email'], 'old@example.com');
  });

  it('AC4: an unclaimed contact is written exactly as before', () => {
    const person = v5Person('2', 'two@example.com');
    const { unclaimed, claimed } = splitPeopleByV6Claim(
      [person],
      USER_ID,
      new Set(['1']),
    );
    assert.deepEqual(claimed, []);
    assert.strictEqual(unclaimed[0], person);
  });

  it('treats everyone as claimed when the lookup failed', () => {
    const { unclaimed, claimed } = splitPeopleByV6Claim(
      [v5Person('1', 'a@example.com'), v5Person('2', 'b@example.com')],
      USER_ID,
      undefined,
    );
    assert.deepEqual(unclaimed, []);
    assert.equal(claimed.length, 2);
    claimed.forEach(person => assert.notProperty(person.fields, 'str::email'));
  });

  it('keeps the email when it is the merge key (it finds the contact, it cannot change it)', () => {
    const { claimed } = splitPeopleByV6Claim(
      [v5Person('1', 'Ada@Example.com')],
      EMAIL,
      new Set(['ada@example.com']),
    );
    assert.equal(claimed[0].fields['str::email'], 'Ada@Example.com');
    assert.notProperty(claimed[0].fields, 'str::first');
    assert.notProperty(claimed[0].fields, 'str::last');
  });

  it('leaves a person with no merge key alone', () => {
    const person = v5Person('', 'a@example.com');
    const { unclaimed } = splitPeopleByV6Claim([person], USER_ID, undefined);
    assert.strictEqual(unclaimed[0], person);
  });
});

describe('orttoV6ClaimGuard - resolveOrttoPersonGetUrl', () => {
  const saved = {
    get: process.env.ORTTO_PERSON_GET_API,
    merge: process.env.ORTTO_PERSON_API,
  };
  afterEach(() => {
    process.env.ORTTO_PERSON_GET_API = saved.get;
    process.env.ORTTO_PERSON_API = saved.merge;
    if (saved.get === undefined) delete process.env.ORTTO_PERSON_GET_API;
    if (saved.merge === undefined) delete process.env.ORTTO_PERSON_API;
  });

  it('derives person/get from the merge endpoint v5 already uses', () => {
    delete process.env.ORTTO_PERSON_GET_API;
    process.env.ORTTO_PERSON_API = 'https://api.ap3api.com/v1/person/merge';
    assert.equal(
      resolveOrttoPersonGetUrl(),
      'https://api.ap3api.com/v1/person/get',
    );
  });

  it('prefers ORTTO_PERSON_GET_API', () => {
    process.env.ORTTO_PERSON_GET_API = 'https://example.test/get';
    assert.equal(resolveOrttoPersonGetUrl(), 'https://example.test/get');
  });
});

describe('NotificationCenterAdapter.updateOrttoPeople with v6-claimed contacts (impact-graph#2348)', () => {
  const savedMergeApi = process.env.ORTTO_PERSON_API;
  let requests: { url: string; data: any }[];
  let stub: sinon.SinonStub;

  beforeEach(() => {
    process.env.ORTTO_PERSON_API = 'https://ortto.test/v1/person/merge';
    requests = [];
    stub = sinon.stub(axios, 'request').callsFake(async (config: any) => {
      requests.push({ url: config.url, data: config.data });
      if (config.url.endsWith('/v1/person/get')) {
        return {
          data: {
            contacts: [
              {
                fields: {
                  [EMAIL]: 'claimed@example.com',
                  [V6_SOURCED_MARKER]: true,
                },
              },
            ],
          },
        };
      }
      return { data: {} };
    });
  });

  afterEach(() => {
    stub.restore();
    if (savedMergeApi === undefined) delete process.env.ORTTO_PERSON_API;
    else process.env.ORTTO_PERSON_API = savedMergeApi;
  });

  it('sends unclaimed people as before and claimed ones without identity, never creating a contact', async () => {
    // Load through the adapter factory, the way the app does: loading the
    // adapter module first trips the factory's import cycle.
    await import('../adaptersFactory');
    const { NotificationCenterAdapter } = await import(
      './NotificationCenterAdapter'
    );
    await new NotificationCenterAdapter().updateOrttoPeople([
      v5Person('1', 'claimed@example.com') as any,
      v5Person('2', 'free@example.com') as any,
    ]);

    const merges = requests.filter(r => r.url.endsWith('/v1/person/merge'));
    assert.equal(merges.length, 2);
    // Outside production v5 merges by email.
    assert.deepEqual(merges[0].data, {
      people: [v5Person('2', 'free@example.com')],
      async: false,
      merge_by: [EMAIL],
    });
    assert.deepEqual(merges[1].data.merge_by, [EMAIL]);
    assert.isTrue(merges[1].data.skip_non_existing);
    assert.deepEqual(merges[1].data.people[0].fields, {
      'str::email': 'claimed@example.com',
      'str:cm:user-id': '1',
      'int:cm:number-of-donations': 3,
      'int:cm:total-donations-value': 12000,
    });
    assert.deepEqual(merges[1].data.people[0].tags, [
      'QF Donor Round 9',
      'Donated on Gnosis',
    ]);
  });
});
