import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tof-highscores-v1';

type TofHighscores = Record<number, number>;

async function load(): Promise<TofHighscores> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function getTofHighscores(): Promise<TofHighscores> {
  return load();
}

export async function updateTofHighscore(
  round: number,
  score: number,
): Promise<{ isNewBest: boolean; previousBest: number }> {
  const highscores = await load();
  const previousBest = highscores[round] ?? 0;
  const isNewBest = score > previousBest;
  if (isNewBest) {
    highscores[round] = score;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(highscores));
  }
  return { isNewBest, previousBest };
}
