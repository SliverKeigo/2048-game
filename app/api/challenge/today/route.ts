import { NextResponse } from 'next/server';
import { getDailyChallenge, isRedisBacked } from '@/lib/leaderboard-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const challenge = await getDailyChallenge();
    return NextResponse.json({
      ...challenge,
      storage: isRedisBacked() ? 'redis' : 'memory',
    });
  } catch (error) {
    console.error('Failed to load daily challenge', error);
    return NextResponse.json(
      {
        message: 'Failed to load challenge',
      },
      {
        status: 500,
      },
    );
  }
}
