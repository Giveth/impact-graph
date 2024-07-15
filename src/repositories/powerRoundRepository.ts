import { PowerRound } from '../entities/powerRound.js';

export const setPowerRound = async (round: number): Promise<PowerRound> => {
  let powerRound = await PowerRound.findOne({ where: {} });

  if (!powerRound) {
    powerRound = PowerRound.create({
      id: true,
      round,
    });
  } else {
    powerRound.round = round;
  }
  return powerRound.save();
};

export const getPowerRound = (): Promise<PowerRound | null> =>
  PowerRound.findOne({ where: {} });
