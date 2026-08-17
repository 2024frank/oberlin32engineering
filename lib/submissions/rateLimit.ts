import 'server-only'
import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
export function hashNetworkAddress(address:string){const salt=process.env.SUBMISSION_SALT;if(!salt)throw new Error('SUBMISSION_SALT_MISSING');return createHash('sha256').update(`${salt}:${address}`).digest('hex')}
export async function consumeSubmissionRateLimit(networkHash:string,limit=8){const s=createSupabaseAdminClient();const{data,error}=await s.rpc('consume_submission_rate_limit',{p_network_hash:networkHash,p_limit:limit});if(error)throw new Error(`RATE_LIMIT_FAILED:${error.message}`);return Boolean(data)}
