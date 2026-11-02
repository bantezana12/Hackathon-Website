import { env } from 'cloudflare:workers';
import { castVote } from '../../../lib/poll';
export async function POST(request: Request) { return castVote(request, env.DB); }
