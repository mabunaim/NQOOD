import {categoryName, validType, validateRecord} from './domain.js';
const fail = () => { throw new Error('ملف النسخة الاحتياطية غير صالح أو غير متوافق. لم تتغير بياناتك.'); };
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const stamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export function validateBackup(input) {
  if (!input || input.app !== 'masareek' || input.version !== 1 || input.currency !== 'JOD' || !stamp(input.exportedAt) || !Array.isArray(input.categories) || !Array.isArray(input.records)) fail();
  const ids = new Map(), names = new Set(), recordIds = new Set();
  const categories = input.categories.map(c => {
    if (!c || !text(c.id) || typeof c.name !== 'string' || typeof c.active !== 'boolean' || !stamp(c.createdAt) || !stamp(c.updatedAt)) fail();
    validType(c.type); const name = categoryName(c.name), key = JSON.stringify([c.type,name]);
    if (ids.has(c.id) || names.has(key)) fail();
    const saved = {id:c.id,type:c.type,name,nameKey:name,active:c.active,createdAt:c.createdAt,updatedAt:c.updatedAt};
    ids.set(c.id,saved); names.add(key); return saved;
  });
  const records = input.records.map(r => {
    if (!r || !text(r.id) || !text(r.categoryId) || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !stamp(r.createdAt) || !stamp(r.updatedAt)) fail();
    validateRecord(r);
    if (recordIds.has(r.id) || !ids.has(r.categoryId) || ids.get(r.categoryId).type !== r.type || r.ym !== r.date.slice(0,7)) fail();
    recordIds.add(r.id);
    return {id:r.id,type:r.type,categoryId:r.categoryId,amountFils:r.amountFils,date:r.date,ym:r.ym,description:r.description,createdAt:r.createdAt,updatedAt:r.updatedAt};
  });
  return {app:'masareek',version:1,currency:'JOD',exportedAt:input.exportedAt,categories,records};
}
export function createBackup(data) { return validateBackup({app:'masareek',version:1,currency:'JOD',exportedAt:new Date().toISOString(),...data}); }
export function parseBackup(source) {
  if (typeof source !== 'string' || source.length > 20000000) fail();
  try { return validateBackup(JSON.parse(source)); } catch { fail(); }
}
