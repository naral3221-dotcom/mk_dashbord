import { NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const version = process.env.npm_package_version ?? '0.0.0';
  const uptime = process.uptime();

  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      version,
      uptime: Math.round(uptime),
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        version,
        uptime: Math.round(uptime),
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
