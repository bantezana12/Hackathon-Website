import { env } from 'cloudflare:workers';
import { getPoll } from '../../../lib/poll';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return getPoll(request, env.DB); }
