import { assert } from 'chai';
import sinon from 'sinon';
import { getMetadataStorage } from 'type-graphql/dist/metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { OwnerOnlyUserField } from './ownerOnlyUserField';
import {
  ownerOnlySelectionFields,
  publicSelectionFields,
  User,
} from '../entities/user';
import type { ApolloContext } from '../types/ApolloContext';

const run = (root: unknown, userId?: unknown) => {
  const next = sinon.stub().resolves('secret');
  const context = {
    req: { user: userId === undefined ? undefined : { userId } },
  } as unknown as ApolloContext;
  return OwnerOnlyUserField(
    { root, context, args: {}, info: {} as never },
    next,
  ).then(value => ({ value, next }));
};

describe('OwnerOnlyUserField', () => {
  it('returns null for anonymous callers without calling next', async () => {
    const { value, next } = await run({ id: 7 });
    assert.isNull(value);
    assert.isFalse(next.called);
  });

  it('returns null for a signed-in non-owner without calling next', async () => {
    const { value, next } = await run({ id: 7 }, 8);
    assert.isNull(value);
    assert.isFalse(next.called);
  });

  it('resolves the field for the owner', async () => {
    const { value, next } = await run({ id: 7 }, 7);
    assert.equal(value, 'secret');
    assert.isTrue(next.calledOnce);
  });

  it('treats string and numeric ids as the same user', async () => {
    const { value } = await run({ id: '7' }, 7);
    assert.equal(value, 'secret');
  });

  it('returns null when the root row has no id', async () => {
    const { value, next } = await run({ walletAddress: '0x1' }, 7);
    assert.isNull(value);
    assert.isFalse(next.called);
  });

  it('returns null for a null userId', async () => {
    const { value } = await run({ id: 7 }, null);
    assert.isNull(value);
  });
});

describe('User private-field lists', () => {
  const strip = (fields: string[]) => fields.map(f => f.replace(/^user\./, ''));

  it('ownerOnlySelectionFields matches the @UseMiddleware(OwnerOnlyUserField) columns', () => {
    const guarded = getMetadataStorage()
      .middlewares.filter(
        m => m.target === User && m.middlewares.includes(OwnerOnlyUserField),
      )
      .map(m => m.fieldName)
      .sort();
    assert.deepEqual(guarded, strip(ownerOnlySelectionFields).sort());
  });

  it('public + owner-only lists cover every @Field-exposed User column', () => {
    const columns = new Set(
      getMetadataArgsStorage()
        .columns.filter(c => c.target === User)
        .map(c => c.propertyName),
    );
    const exposedColumns = getMetadataStorage()
      .fields.filter(f => f.target === User && columns.has(f.name))
      .map(f => f.name)
      .sort();
    assert.deepEqual(
      exposedColumns,
      [
        ...strip(publicSelectionFields),
        ...strip(ownerOnlySelectionFields),
      ].sort(),
    );
  });
});
