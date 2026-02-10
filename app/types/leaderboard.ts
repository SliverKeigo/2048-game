export type GameMode = 'classic' | 'daily';

export type LeaderboardScope = 'all' | 'daily' | 'weekly' | 'challenge';

export interface DailyChallenge {
  id: string;
  seed: string;
  date: string;
  timezone: 'UTC';
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  score: number;
  moves: number;
  updatedAt: string;
  mode: GameMode;
}

export interface LeaderboardSnapshot {
  all: LeaderboardEntry[];
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  challenge: LeaderboardEntry[];
  challengeId: string | null;
  date: string;
  week: string;
  storage: 'redis' | 'memory';
}

export interface SubmitScoreInput {
  playerId: string;
  name: string;
  score: number;
  moves: number;
  mode: GameMode;
  challengeId?: string | null;
}
