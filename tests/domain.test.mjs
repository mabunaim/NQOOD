import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney, formatMoney, parseDate, todayISO, monthlyTotals, daysLabel, categoryName, validateRecord} from '../src/js/domain.js';
test('exact income/expense totals and 3-decimal offline example', () => {
 const rows=[{type:'income',amountFils:parseMoney('1000'),date:'2026-10-01'},{type:'expense',amountFils:parseMoney('20'),date:'2026-10-02'},{type:'expense',amountFils:parseMoney('5.125'),date:'2026-10-03'}];
 assert.equal(formatMoney(monthlyTotals(rows,'2026-10').remaining),'974.875');
 assert.equal(formatMoney(monthlyTotals(rows,'2026-10').expense),'25.125');
});
test('Arabic digit normalization and exact fils',()=>{assert.equal(parseMoney('٢٠٫٥٠٠'),20500);assert.equal(parseMoney('۵.۱۲۵'),5125);assert.equal(parseMoney('0.001'),1);assert.equal(parseMoney('999999.999'),999999999);});
test('invalid amounts and boundaries rejected',()=>{for(const s of ['', ' ', '0','0.000','-1','+1','1.0001','1,000','1e3','Infinity','abc','1000000','999999999999999999999999999'])assert.throws(()=>parseMoney(s),s);});
test('format grouping and no trailing zeros',()=>{assert.equal(formatMoney(1000000),'1,000');assert.equal(formatMoney(20500),'20.5');assert.equal(formatMoney(-5125),'−5.125');assert.equal(formatMoney(0),'0');});
test('monthly isolation and no carryover',()=>{const r=[{type:'income',amountFils:50000,date:'2026-09-30'},{type:'expense',amountFils:20000,date:'2026-10-01'}];assert.equal(monthlyTotals(r,'2026-10').remaining,-20000n);assert.equal(monthlyTotals(r,'2026-11').remaining,0n);});
test('large aggregate stays exact beyond Number safe integer',()=>{assert.equal(formatMoney(9007199254740993001n),'9,007,199,254,740,993.001');});
test('valid leap date and Arabic date accepted',()=>{assert.equal(parseDate('٢٩/٠٢/٢٠٢٤','2026-10-12'),'2024-02-29');});
test('invalid dates, years and future dates rejected',()=>{for(const d of ['31/09/2026','29/02/2025','00/10/2026','12/13/2026','01/01/0000','13/10/2026','2026-10-12'])assert.throws(()=>parseDate(d,'2026-10-12'),d);});
test('local date and month-day labels',()=>{const now=new Date(2026,9,12,23,30);assert.equal(todayISO(now),'2026-10-12');assert.equal(daysLabel('2026-10',now),'باقي 19 يوم');assert.equal(daysLabel('2026-09',now),'شهر منتهٍ');assert.equal(daysLabel('2024-02',new Date(2024,1,29)),'آخر يوم بالشهر');});
test('category name trims only; explicit length limit',()=>{assert.equal(categoryName('  Home  '),'Home');assert.equal(categoryName('a'.repeat(50)).length,50);assert.throws(()=>categoryName('a'.repeat(51)));assert.throws(()=>categoryName('  '));});
test('record validation enforces mandatory fields and optional description limit',()=>{const base={id:'1',categoryId:'c',type:'expense',amountFils:1,date:'2026-10-01',description:''};assert.equal(validateRecord(base,'2026-10-12'),base);assert.throws(()=>validateRecord({...base,categoryId:''},'2026-10-12'));assert.throws(()=>validateRecord({...base,description:'a'.repeat(251)},'2026-10-12'));assert.throws(()=>validateRecord({...base,type:'other'},'2026-10-12'));});
