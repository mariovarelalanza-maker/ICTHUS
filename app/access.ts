import {env} from 'cloudflare:workers';
export const noStore={'Cache-Control':'private, no-store'};
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function sessionKey(req:Request){const token=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('__Host-icthus='))?.split('=')[1];return token&&/^[a-f0-9]{64}$/.test(token)?'session:'+await hash(token):null}
export async function roleFor(req:Request){const key=await sessionKey(req);if(!key)return null;const record=await env.DB!.prepare('SELECT value FROM settings WHERE id=?').bind(key).first<{value:string}>();if(!record)return null;try{const s=JSON.parse(record.value);const expected=s.role==='admin'?(env as any).ADMIN_PASSWORD_HASH:(env as any).VIEWER_PASSWORD_HASH;return s.expires>Date.now()&&expected&&s.version===expected&&['admin','viewer'].includes(s.role)?s.role:null}catch{return null}}
export function validOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin}
