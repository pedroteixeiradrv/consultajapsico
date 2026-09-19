import fs from "fs";import path from "path";
import { DEFAULT_PRICES } from "@/lib/types";
import type { Admin,Client,ConsultationRequest,CreditsLedgerEntry,EmailLogEntry,Payout,PayoutBatch,PlatformSettings,Psychologist,SacTicket } from "@/lib/types";
export type Database={admins:Admin[];psychologists:Psychologist[];clients:Client[];consultation_requests:ConsultationRequest[];credits_ledger:CreditsLedgerEntry[];sac_tickets:SacTicket[];platform_settings:PlatformSettings;payouts:Payout[];payout_batches:PayoutBatch[];email_log:EmailLogEntry[]};
const D=path.join(process.cwd(),"data"),F=path.join(D,"store.json");
function emptyDb():Database{const n=new Date().toISOString();return{admins:[],psychologists:[],clients:[],consultation_requests:[],credits_ledger:[],sac_tickets:[],platform_settings:{id:"default",monthly_fee_cents:DEFAULT_PRICES.monthlyFeeCents,price_id_cents:DEFAULT_PRICES.priceIdCents,psych_cut_id_cents:DEFAULT_PRICES.psychCutIdCents,session_duration_minutes:DEFAULT_PRICES.sessionMinutes,created_at:n,updated_at:n},payouts:[],payout_batches:[],email_log:[]}}
let lock:Promise<void>=Promise.resolve();function run<T>(f:()=>T){const r=lock.then(f);lock=r.then(()=>undefined,()=>undefined);return r}function dir(){if(!fs.existsSync(D))fs.mkdirSync(D,{recursive:true})}
function read():Database{dir();const b=emptyDb();if(!fs.existsSync(F)){fs.writeFileSync(F,JSON.stringify(b));return b}try{return{...b,...JSON.parse(fs.readFileSync(F,"utf8"))}as Database}catch{return b}}
function write(db:Database){dir();const t=F+".tmp";fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,F)}
export async function mutateStore<T>(f:(db:Database)=>T):Promise<T>{return run(()=>{const db=read(),v=f(db);write(db);return v})}export async function readStore(){return run(read)}export function newId(){return crypto.randomUUID()}export function nowIso(){return new Date().toISOString()}
