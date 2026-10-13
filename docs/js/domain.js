export const MAX_FILS = 999999999;
export function normalizeDigits(value) {
  return String(value).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/٫/g, '.');
}
export function parseMoney(value) {
  const s = normalizeDigits(value).trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(s)) throw new Error('أدخل مبلغًا موجبًا حتى 3 خانات عشرية، دون فاصلة آلاف.');
  const [whole, fraction = ''] = s.split('.');
  const n = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (n <= 0n || n > BigInt(MAX_FILS)) throw new Error('المبلغ يجب أن يكون أكبر من 0 وحتى 999,999.999 دينار.');
  return Number(n);
}
export function formatMoney(fils) {
  const n = BigInt(fils), negative = n < 0n, abs = negative ? -n : n;
  const integer = (abs / 1000n).toLocaleString('en-US');
  const decimals = String(abs % 1000n).padStart(3, '0').replace(/0+$/, '');
  return (negative ? '−' : '') + integer + (decimals ? '.' + decimals : '');
}
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export const displayDate = iso => iso.split('-').reverse().join('/');
export function parseDate(value, today = todayISO()) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalizeDigits(value).trim());
  if (!m) throw new Error('اكتب التاريخ بصيغة DD/MM/YYYY.');
  const [, day, month, year] = m;
  const date = new Date(0); date.setUTCFullYear(Number(year), Number(month) - 1, Number(day)); date.setUTCHours(0, 0, 0, 0);
  const iso = `${year}-${month}-${day}`;
  if (Number(year) < 1 || date.toISOString().slice(0, 10) !== iso || iso > today) throw new Error('اختر تاريخًا صحيحًا لا يتجاوز اليوم.');
  return iso;
}
export function categoryName(value) {
  const name = String(value).trim();
  if (!name || Array.from(name).length > 50) throw new Error('اسم التصنيف مطلوب وبحد أقصى 50 حرفًا.');
  return name;
}
export function validType(type) { if (!['income', 'expense'].includes(type)) throw new Error('نوع الحركة غير صحيح.'); return type; }
export function validateRecord(r, today = todayISO()) {
  validType(r.type);
  if (!r.id || !r.categoryId) throw new Error('اختر التصنيف قبل الحفظ.');
  if (!Number.isSafeInteger(r.amountFils) || r.amountFils <= 0 || r.amountFils > MAX_FILS) throw new Error('المبلغ غير صالح.');
  parseDate(displayDate(r.date), today);
  if (typeof r.description !== 'string' || Array.from(r.description).length > 250) throw new Error('الوصف بحد أقصى 250 حرفًا.');
  return r;
}
export function monthlyTotals(records, month) {
  let income = 0n, expense = 0n;
  for (const r of records) if (r.date.slice(0, 7) === month) { if (r.type === 'income') income += BigInt(r.amountFils); else expense += BigInt(r.amountFils); }
  return {income, expense, remaining: income - expense};
}
export function daysLabel(month, now = new Date()) {
  const current = todayISO(now).slice(0, 7);
  if (month < current) return 'شهر منتهٍ';
  if (month > current) return 'شهر قادم';
  const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  return count === 0 ? 'آخر يوم بالشهر' : `باقي ${count} يوم`;
}
export function categorySummary(records, categories, month, type) {
  const groups = new Map(); let total = 0n;
  for (const r of records) if (r.date.slice(0,7) === month && r.type === type) {
    const amount = BigInt(r.amountFils); total += amount;
    const group = groups.get(r.categoryId) || {id:r.categoryId, amount:0n, count:0};
    group.amount += amount; group.count++; groups.set(r.categoryId, group);
  }
  return [...groups.values()].map(group => ({...group, name:categories.find(c=>c.id===group.id)?.name || 'تصنيف غير متاح', percent:total ? Number((group.amount*1000n+total/2n)/total)/10 : 0})).sort((a,b)=>a.amount===b.amount?a.name.localeCompare(b.name,'ar'):a.amount>b.amount?-1:1);
}
