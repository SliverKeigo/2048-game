import { NextRequest, NextResponse } from 'next/server';
import {
  getLeaderboardSnapshot,
  isChallengeId,
  submitScore,
} from '@/lib/leaderboard-store';
import type { GameMode, SubmitScoreInput } from '@/app/types/leaderboard';

export const dynamic = 'force-dynamic';

const PLAYER_ID_PATTERN = /^[a-zA-Z0-9_-]{6,48}$/;
const NAME_MAX_LENGTH = 24;

const clampLimit = (value: string | null): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 8;
  return Math.min(20, Math.max(3, Math.floor(parsed)));
};

const normalizeName = (value: string, playerId: string): string => {
  const trimmed = value.trim().slice(0, NAME_MAX_LENGTH);
  if (trimmed.length > 0) return trimmed;
  return `Player-${playerId.slice(-4).toUpperCase()}`;
};

const asNonNegativeInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const integer = Math.floor(value);
  return integer >= 0 ? integer : null;
};

const parseSubmission = (raw: unknown): { data: SubmitScoreInput } | { error: string } => {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' };
  }

  const payload = raw as {
    playerId?: unknown;
    name?: unknown;
    score?: unknown;
    moves?: unknown;
    mode?: unknown;
    challengeId?: unknown;
  };

  if (typeof payload.playerId !== 'string' || !PLAYER_ID_PATTERN.test(payload.playerId)) {
    return { error: 'Invalid playerId' };
  }

  if (typeof payload.name !== 'string') {
    return { error: 'Invalid name' };
  }

  const score = asNonNegativeInt(payload.score);
  const moves = asNonNegativeInt(payload.moves);
  if (score === null || moves === null) {
    return { error: 'Invalid score or moves' };
  }

  if (score > 5_000_000 || moves > 100_000) {
    return { error: 'Score or moves exceeds limits' };
  }

  if (payload.mode !== 'classic' && payload.mode !== 'daily') {
    return { error: 'Invalid mode' };
  }

  let challengeId: string | null | undefined;
  if (payload.challengeId === null || payload.challengeId === undefined || payload.challengeId === '') {
    challengeId = null;
  } else if (typeof payload.challengeId === 'string' && isChallengeId(payload.challengeId)) {
    challengeId = payload.challengeId;
  } else {
    return { error: 'Invalid challengeId' };
  }

  const mode = payload.mode as GameMode;

  return {
    data: {
      playerId: payload.playerId,
      name: normalizeName(payload.name, payload.playerId),
      score,
      moves,
      mode,
      challengeId,
    },
  };
};

export async function GET(request: NextRequest) {
  try {
    const challengeIdRaw = request.nextUrl.searchParams.get('challengeId');
    const challengeId = challengeIdRaw && isChallengeId(challengeIdRaw) ? challengeIdRaw : null;
    const limit = clampLimit(request.nextUrl.searchParams.get('limit'));

    const snapshot = await getLeaderboardSnapshot({
      challengeId,
      limit,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Failed to fetch leaderboard', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch leaderboard',
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json()) as unknown;
    const parsed = parseSubmission(rawBody);

    if ('error' in parsed) {
      return NextResponse.json(
        { message: parsed.error },
        {
          status: 400,
        },
      );
    }

    await submitScore(parsed.data);

    const snapshot = await getLeaderboardSnapshot({
      challengeId: parsed.data.challengeId,
      limit: 8,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Failed to submit leaderboard score', error);
    return NextResponse.json(
      {
        message: 'Failed to submit score',
      },
      {
        status: 500,
      },
    );
  }
}
