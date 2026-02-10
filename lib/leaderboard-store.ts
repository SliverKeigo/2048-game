import { createClient } from '@vercel/kv';
import type {
  DailyChallenge,
  GameMode,
  LeaderboardEntry,
  LeaderboardSnapshot,
  SubmitScoreInput,
} from '@/app/types/leaderboard';

type PlayerProfile = {
  name: string;
  updatedAt: string;
};

type EntryMeta = {
  name: string;
  moves: number;
  updatedAt: string;
  mode: GameMode;
};

type MemoryStore = {
  scores: Map<string, Map<string, number>>;
  entryMeta: Map<string, EntryMeta>;
  players: Map<string, PlayerProfile>;
  challengeSeeds: Map<string, string>;
};

const KV_URL =
  process.env.KV_REST_API_URL ??
  process.env.REDIS_URL ??
  process.env.REDIS_REST_URL ??
  process.env.redis_url;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ??
  process.env.REDIS_TOKEN ??
  process.env.redis_token ??
  process.env.KV_REST_API_READ_ONLY_TOKEN;
const hasRedisRestConfig = Boolean(KV_URL && KV_TOKEN);
const hasRedisUrlScheme = typeof KV_URL === 'string' && /^https?:\/\//.test(KV_URL);
const hasRedis = hasRedisRestConfig && hasRedisUrlScheme;

if (hasRedisRestConfig && !hasRedisUrlScheme) {
  console.warn('Redis is configured with a non-REST URL. Falling back to in-memory leaderboard store.');
}

const kv = hasRedis
  ? createClient({
      url: KV_URL as string,
      token: KV_TOKEN as string,
    })
  : null;

const globalStore = globalThis as typeof globalThis & {
  __leaderboardMemoryStore?: MemoryStore;
};

const memoryStore: MemoryStore =
  globalStore.__leaderboardMemoryStore ?? {
    scores: new Map(),
    entryMeta: new Map(),
    players: new Map(),
    challengeSeeds: new Map(),
  };

if (!globalStore.__leaderboardMemoryStore) {
  globalStore.__leaderboardMemoryStore = memoryStore;
}

const STORAGE_TYPE: LeaderboardSnapshot['storage'] = hasRedis ? 'redis' : 'memory';

const SCOREBOARD_KEYS = {
  all: 'lb:all',
  daily: (dateKey: string) => `lb:daily:${dateKey}`,
  weekly: (weekKey: string) => `lb:weekly:${weekKey}`,
  challenge: (challengeId: string) => `lb:challenge:${challengeId}`,
};

const challengeSeedKey = (dateKey: string) => `lb:challenge-seed:${dateKey}`;
const playerKey = (playerId: string) => `lb:player:${playerId}`;
const entryMetaKey = (boardKey: string, playerId: string) => `lb:entry:${boardKey}:${playerId}`;
const memoryMetaKey = (boardKey: string, playerId: string) => `${boardKey}::${playerId}`;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_LEADERBOARD_LIMIT = 8;

const getUtcDateKey = (date = new Date()): string => date.toISOString().slice(0, 10);

const getUtcWeekKey = (date = new Date()): string => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const days = Math.floor((target.getTime() - yearStart.getTime()) / 86400000) + 1;
  const week = Math.ceil(days / 7);

  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const normalizeChallengeId = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!DATE_KEY_PATTERN.test(trimmed)) return null;
  return trimmed;
};

const defaultNameForPlayer = (playerId: string): string => `Player-${playerId.slice(-4).toUpperCase()}`;

const asGameMode = (value: unknown): GameMode => (value === 'daily' ? 'daily' : 'classic');

const createChallengeSeed = (dateKey: string): string => {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${dateKey}-${randomPart}`;
};

const getMemoryBucket = (boardKey: string): Map<string, number> => {
  const existing = memoryStore.scores.get(boardKey);
  if (existing) return existing;

  const created = new Map<string, number>();
  memoryStore.scores.set(boardKey, created);
  return created;
};

const upsertBoardScore = async (boardKey: string, input: SubmitScoreInput, updatedAt: string) => {
  if (hasRedis && kv) {
    const existing = (await kv.zscore(boardKey, input.playerId)) as number | null;
    if (typeof existing === 'number' && input.score <= existing) {
      return;
    }

    await Promise.all([
      kv.zadd(boardKey, { score: input.score, member: input.playerId }),
      kv.hset(entryMetaKey(boardKey, input.playerId), {
        name: input.name,
        moves: input.moves,
        updatedAt,
        mode: input.mode,
      }),
      kv.hset(playerKey(input.playerId), {
        name: input.name,
        updatedAt,
      }),
    ]);

    return;
  }

  const bucket = getMemoryBucket(boardKey);
  const existing = bucket.get(input.playerId);
  if (typeof existing === 'number' && input.score <= existing) {
    return;
  }

  bucket.set(input.playerId, input.score);
  memoryStore.entryMeta.set(memoryMetaKey(boardKey, input.playerId), {
    name: input.name,
    moves: input.moves,
    updatedAt,
    mode: input.mode,
  });
  memoryStore.players.set(input.playerId, {
    name: input.name,
    updatedAt,
  });
};

const getTopEntriesFromBoard = async (boardKey: string, limit: number): Promise<LeaderboardEntry[]> => {
  if (hasRedis && kv) {
    const playerIds = (await kv.zrange(boardKey, 0, Math.max(limit - 1, 0), {
      rev: true,
    })) as string[];
    if (!playerIds.length) return [];

    const entries = await Promise.all(
      playerIds.map(async (playerId) => {
        const [score, meta, playerProfile] = await Promise.all([
          kv.zscore(boardKey, playerId) as Promise<number | null>,
          kv.hgetall<EntryMeta>(entryMetaKey(boardKey, playerId)),
          kv.hgetall<PlayerProfile>(playerKey(playerId)),
        ]);

        return {
          playerId,
          score: typeof score === 'number' ? score : 0,
          name: meta?.name ?? playerProfile?.name ?? defaultNameForPlayer(playerId),
          moves: Number(meta?.moves ?? 0),
          updatedAt: meta?.updatedAt ?? playerProfile?.updatedAt ?? new Date(0).toISOString(),
          mode: asGameMode(meta?.mode),
        };
      }),
    );

    return entries
      .filter((entry) => entry.score > 0)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));
  }

  const bucket = getMemoryBucket(boardKey);
  const sorted = [...bucket.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

  return sorted.map(([playerId, score], index) => {
    const meta = memoryStore.entryMeta.get(memoryMetaKey(boardKey, playerId));
    const profile = memoryStore.players.get(playerId);

    return {
      rank: index + 1,
      playerId,
      score,
      name: meta?.name ?? profile?.name ?? defaultNameForPlayer(playerId),
      moves: meta?.moves ?? 0,
      updatedAt: meta?.updatedAt ?? profile?.updatedAt ?? new Date(0).toISOString(),
      mode: asGameMode(meta?.mode),
    };
  });
};

export const getDailyChallenge = async (date = new Date()): Promise<DailyChallenge> => {
  const dateKey = getUtcDateKey(date);

  if (hasRedis && kv) {
    const key = challengeSeedKey(dateKey);
    let seed = await kv.get<string>(key);

    if (!seed) {
      const candidate = createChallengeSeed(dateKey);
      await kv.set(key, candidate, {
        nx: true,
        ex: 60 * 60 * 24 * 14,
      });
      seed = (await kv.get<string>(key)) ?? candidate;
    }

    return {
      id: dateKey,
      seed,
      date: dateKey,
      timezone: 'UTC',
    };
  }

  let seed = memoryStore.challengeSeeds.get(dateKey);
  if (!seed) {
    seed = createChallengeSeed(dateKey);
    memoryStore.challengeSeeds.set(dateKey, seed);
  }

  return {
    id: dateKey,
    seed,
    date: dateKey,
    timezone: 'UTC',
  };
};

type SnapshotParams = {
  challengeId?: string | null;
  limit?: number;
  now?: Date;
};

export const getLeaderboardSnapshot = async ({
  challengeId,
  limit = DEFAULT_LEADERBOARD_LIMIT,
  now = new Date(),
}: SnapshotParams): Promise<LeaderboardSnapshot> => {
  const dateKey = getUtcDateKey(now);
  const weekKey = getUtcWeekKey(now);
  const challengeKey = normalizeChallengeId(challengeId);

  const [all, daily, weekly, challenge] = await Promise.all([
    getTopEntriesFromBoard(SCOREBOARD_KEYS.all, limit),
    getTopEntriesFromBoard(SCOREBOARD_KEYS.daily(dateKey), limit),
    getTopEntriesFromBoard(SCOREBOARD_KEYS.weekly(weekKey), limit),
    challengeKey
      ? getTopEntriesFromBoard(SCOREBOARD_KEYS.challenge(challengeKey), limit)
      : Promise.resolve([]),
  ]);

  return {
    all,
    daily,
    weekly,
    challenge,
    challengeId: challengeKey,
    date: dateKey,
    week: weekKey,
    storage: STORAGE_TYPE,
  };
};

export const submitScore = async (input: SubmitScoreInput): Promise<void> => {
  const now = new Date();
  const dateKey = getUtcDateKey(now);
  const weekKey = getUtcWeekKey(now);
  const challengeId = normalizeChallengeId(input.challengeId);
  const updatedAt = now.toISOString();

  const boardKeys = [
    SCOREBOARD_KEYS.all,
    SCOREBOARD_KEYS.daily(dateKey),
    SCOREBOARD_KEYS.weekly(weekKey),
  ];

  if (input.mode === 'daily' && challengeId) {
    boardKeys.push(SCOREBOARD_KEYS.challenge(challengeId));
  }

  await Promise.all(boardKeys.map((boardKey) => upsertBoardScore(boardKey, input, updatedAt)));
};

export const isRedisBacked = (): boolean => hasRedis;

export const isChallengeId = (value: string): boolean => DATE_KEY_PATTERN.test(value);
