import { assert } from 'chai';
import { QfRound } from './qfRound';

describe('QfRound', () => {
  describe('calculateCumulativeCaps', () => {
    it('should set caps equal to round caps when defined', async () => {
      const qfRound = QfRound.create({
        roundPOLCapPerProject: 1000,
        roundPOLCapPerUserPerProject: 100,
      });

      await qfRound.calculateCumulativeCaps();

      assert.equal(qfRound.cumulativePOLCapPerProject, 1000);
      assert.equal(qfRound.cumulativePOLCapPerUserPerProject, 100);
    });

    it('should set caps to 0 when round caps are not defined', async () => {
      const qfRound = QfRound.create({
        roundPOLCapPerProject: undefined,
        roundPOLCapPerUserPerProject: undefined,
      });

      await qfRound.calculateCumulativeCaps();

      assert.equal(qfRound.cumulativePOLCapPerProject, 0);
      assert.equal(qfRound.cumulativePOLCapPerUserPerProject, 0);
    });

    it('should handle mixed undefined caps', async () => {
      const qfRound = QfRound.create({
        roundPOLCapPerProject: 1000,
        roundPOLCapPerUserPerProject: undefined,
      });

      await qfRound.calculateCumulativeCaps();

      assert.equal(qfRound.cumulativePOLCapPerProject, 1000);
      assert.equal(qfRound.cumulativePOLCapPerUserPerProject, 0);
    });
  });
});
