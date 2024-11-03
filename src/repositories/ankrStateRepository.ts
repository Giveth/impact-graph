import { AnkrState } from '../entities/ankrState';

export const setAnkrTimestamp = async (
  timestamp: number,
): Promise<AnkrState> => {
  let state = await AnkrState.findOne({ where: {} });

  if (!state) {
    state = AnkrState.create({
      id: true,
      timestamp,
    });
  } else {
    state.timestamp = timestamp;
  }
  return state.save();
};

export const getAnkrState = (): Promise<AnkrState | null> =>
  AnkrState.findOne({ where: {} });
