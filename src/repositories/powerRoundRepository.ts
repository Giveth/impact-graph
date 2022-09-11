import { PowerRound } from '../entities/powerRound';

export const setPowerRound = async (round: number): Promise<PowerRound> => {
  let powerRound = await PowerRound.findOne();

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

export const getPowerRound = (): Promise<PowerRound | undefined> =>
  PowerRound.findOne();
