type Movement = {detail:string;category:string;income:number;expense:number};
const clean=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function isOffering(row:Movement){return /ofrenda/.test(clean(row.detail+' '+row.category))}
export function expenseCategory(row:Movement){
 const detail=clean(row.detail),category=clean(row.category);
 // Mixed entries retain their independent income and expense amounts.
 if(/meriend/.test(detail+' '+category))return 'Merienda';
 if(/ofrenda/.test(category))return 'Otros gastos';
 return row.category||'General';
}
export function incomeCategory(row:Movement){return isOffering(row)?'Ofrendas':(!row.category||/general|meriend/i.test(row.category)?'Otros ingresos':row.category)}
export function movementLabel(row:Movement){return [row.income>0?incomeCategory(row):'',row.expense>0?expenseCategory(row):''].filter(Boolean).join(' · ')}
