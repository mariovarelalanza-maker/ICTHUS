/** Fiscal year follows the movement date; undated legacy records belong to 2026. */
export const TIME_ZONE='America/Tegucigalpa';
export function localDate(now=new Date()) {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=(key:string)=>parts.find(p=>p.type===key)!.value;return `${get('year')}-${get('month')}-${get('day')}`;}
export const currentYear=(now=new Date())=>Number(localDate(now).slice(0,4));
export function accountingYear(row:{date:string,accountingYear?:number}){return row.date?Number(row.date.slice(0,4)):row.accountingYear??2026;}
export function forYear<T extends {date:string,accountingYear?:number}>(rows:T[],year:number){return rows.filter(r=>accountingYear(r)===year);}
export function isValidDate(value:unknown):value is string {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number(value.slice(0,4))>=1900&&Number(value.slice(0,4))<=9999&&!isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value;}
