import { assert } from 'chai';
import { assertThrowsAsync } from '../../test/testUtils.js';
import { getPowerRound, setPowerRound } from './powerRoundRepository.js';
import { PowerRound } from '../entities/powerRound.js';

describe('powerRoundRepository testCases', () => {
  it('should return correct round after setting', async () => {
    let round: PowerRound | null = await setPowerRound(12);
    assert.equal(round.round, 12);
    assert.equal(await PowerRound.count(), 1);

    round = await getPowerRound();
    assert.isDefined(round);
    assert.equal(round?.round, 12);

    await setPowerRound(35);
    assert.equal(await PowerRound.count(), 1);
    round = await getPowerRound();
    assert.equal(round?.round, 35);
  });

  it('should reject having multiple power rounds', async () => {
    let round: PowerRound | null = await setPowerRound(12);
    assert.equal(round.round, 12);
    round = await getPowerRound();
    assert.isDefined(round);
    assert.equal(round?.round, 12);

    assert.equal(await PowerRound.count(), 1);

    await assertThrowsAsync(
      () =>
        PowerRound.create({
          id: false,
          round: 15,
        }).save(),
      '',
    );

    assert.equal(await PowerRound.count(), 1);

    await PowerRound.create({
      id: true,
      round: 14,
    }).save();

    assert.equal(await PowerRound.count(), 1);
  });
});
