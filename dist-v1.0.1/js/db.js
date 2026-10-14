import {validateBackup, createBackup} from './backup.js';
import {categoryName, validType, validateRecord} from './domain.js';
export const DB_VERSION = 1;
export function openDatabase(name, factory = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!factory) return reject(new Error('التخزين المحلي غير متاح في هذا المتصفح.'));
    let finished = false;
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const categories = db.createObjectStore('categories', {keyPath: 'id'});
      categories.createIndex('uniqueName', ['type', 'nameKey'], {unique: true});
      const records = db.createObjectStore('transactions', {keyPath: 'id'});
      records.createIndex('month', 'ym');
      db.createObjectStore('meta', {keyPath: 'key'}).put({key: 'schemaVersion', value: DB_VERSION});
    };
    request.onsuccess = () => {
      if (finished) { request.result.close(); return; }
      finished = true; const db = request.result;
      db.onversionchange = () => db.close(); resolve(db);
    };
    request.onerror = () => { finished = true; reject(request.error); };
    request.onblocked = () => { finished = true; reject(new Error('أغلق النوافذ الأخرى للتطبيق ثم أعد المحاولة.')); };
  });
}
function atomic(db, stores, mode, work) {
  return new Promise((resolve, reject) => {
    let result, cause;
    const tx = db.transaction(stores, mode);
    const abort = error => { cause = error; tx.abort(); };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(cause || tx.error || new Error('فشلت الكتابة؛ لم تُحفظ الحركة.'));
    tx.onerror = () => {}; // Abort is the terminal failure; never resolve on a request's success.
    try { work(tx, value => { result = value; }, abort); } catch (error) { abort(error); }
  });
}
export function createRepository(db, {testMode = false} = {}) {
  let abortNext = false;
  return {
    dbName: db.name,
    async readAll() {
      return atomic(db, ['categories', 'transactions'], 'readonly', (tx, done) => {
        const data = {categories: [], records: []};
        tx.objectStore('categories').getAll().onsuccess = e => { data.categories = e.target.result; };
        tx.objectStore('transactions').getAll().onsuccess = e => { data.records = e.target.result; };
        done(data);
      });
    },
    async addCategory({id, type, name}) {
      validType(type); name = categoryName(name);
      const now = new Date().toISOString();
      const record = {id, type, name, nameKey: name, active: true, createdAt: now, updatedAt: now};
      if (!id) throw new Error('معرّف التصنيف غير صالح.');
      return atomic(db, ['categories'], 'readwrite', (tx, done) => { tx.objectStore('categories').add(record); done(record); });
    },
    async updateCategory(id, patch) {
      if (!id || !patch || Object.keys(patch).some(k => !['name', 'active'].includes(k))) throw new Error('لا يمكن تغيير نوع التصنيف أو معرّفه.');
      const change = {...patch};
      if ('name' in change) change.name = categoryName(change.name);
      if ('active' in change && typeof change.active !== 'boolean') throw new Error('حالة التصنيف غير صالحة.');
      return atomic(db, ['categories'], 'readwrite', (tx, done, abort) => {
        const store = tx.objectStore('categories'), request = store.get(id);
        request.onsuccess = () => {
          if (!request.result) { abort(new Error('التصنيف غير موجود.')); return; }
          const saved = {...request.result, ...change, updatedAt: new Date().toISOString()};
          saved.nameKey = saved.name; store.put(saved); done(saved);
        };
      });
    },
    async deleteCategory(id) {
      return atomic(db, ['categories', 'transactions'], 'readwrite', (tx, done, abort) => {
        const categories = tx.objectStore('categories'), request = categories.get(id);
        request.onsuccess = () => {
          if (!request.result) { abort(new Error('التصنيف غير موجود.')); return; }
          const cursor = tx.objectStore('transactions').openCursor();
          cursor.onsuccess = () => {
            const row = cursor.result;
            if (!row) { categories.delete(id); done(id); return; }
            if (row.value.categoryId === id) { abort(new Error('التصنيف مرتبط بحركات؛ يمكنك تعطيله بدل الحذف.')); return; }
            row.continue();
          };
        };
      });
    },
    async addRecord(record) {
      validateRecord(record);
      return atomic(db, ['categories', 'transactions'], 'readwrite', (tx, done, abort) => {
        const records = tx.objectStore('transactions');
        const request = tx.objectStore('categories').get(record.categoryId);
        request.onsuccess = () => {
          const cat = request.result;
          if (!cat || !cat.active || cat.type !== record.type) { abort(new Error('اختر تصنيفًا فعّالًا مطابقًا لنوع الحركة.')); return; }
          const existing = records.get(record.id);
          existing.onsuccess = () => {
            if (existing.result) {
              const keys = ['type', 'categoryId', 'amountFils', 'date', 'description'];
              if (keys.some(k => existing.result[k] !== record[k])) { abort(new Error('هذه الحركة محفوظة مسبقًا بقيم مختلفة.')); return; }
              done(existing.result); return; // Retry after an uncertain UI response is idempotent.
            }
            const now = new Date().toISOString();
            const saved = {...record, ym: record.date.slice(0, 7), createdAt: now, updatedAt: now};
            const write = records.add(saved);
            write.onsuccess = () => {
              if (testMode && abortNext) { abortNext = false; abort(new Error('T08: أُلغيت عملية الكتابة للاختبار؛ لم تُحفظ الحركة.')); }
              else done(saved);
            };
          };
        };
      });
    },
    async updateRecord(record) {
      validateRecord(record);
      return atomic(db, ['categories', 'transactions'], 'readwrite', (tx, done, abort) => {
        const records = tx.objectStore('transactions'), request = records.get(record.id);
        request.onsuccess = () => {
          const old = request.result;
          if (!old) { abort(new Error('الحركة غير موجودة.')); return; }
          if (old.type !== record.type) { abort(new Error('لا يمكن تغيير نوع الحركة.')); return; }
          if (old.ym !== record.date.slice(0, 7)) { abort(new Error('لا يمكن نقل الحركة إلى شهر آخر.')); return; }
          const category = tx.objectStore('categories').get(record.categoryId);
          category.onsuccess = () => {
            const cat = category.result;
            if (!cat || cat.type !== old.type || (!cat.active && cat.id !== old.categoryId)) { abort(new Error('اختر تصنيفًا فعّالًا مطابقًا لنوع الحركة.')); return; }
            const saved = {...old, categoryId:record.categoryId, amountFils:record.amountFils, date:record.date, description:record.description, updatedAt:new Date().toISOString()};
            records.put(saved).onsuccess = () => {
              if (testMode && abortNext) { abortNext = false; abort(new Error('T08: لم يُحفظ التعديل.')); } else done(saved);
            };
          };
        };
      });
    },
    async deleteRecord(id) {
      return atomic(db, ['transactions'], 'readwrite', (tx, done, abort) => {
        const records = tx.objectStore('transactions'), request = records.get(id);
        request.onsuccess = () => {
          if (!request.result) { abort(new Error('الحركة غير موجودة.')); return; }
          records.delete(id).onsuccess = () => {
            if (testMode && abortNext) { abortNext = false; abort(new Error('T08: لم تُحذف الحركة.')); } else done(id);
          };
        };
      });
    },
    async clearAllData() {
      return atomic(db, ['categories', 'transactions', 'meta'], 'readwrite', (tx, done, abort) => {
        for (const name of ['categories', 'transactions', 'meta']) tx.objectStore(name).clear();
        tx.objectStore('meta').put({key:'schemaVersion',value:DB_VERSION}).onsuccess = () => {
          if (testMode && abortNext) { abortNext=false; abort(new Error('T08: تعذر المسح؛ بقيت البيانات كما هي.')); }
          else done({categories:[],records:[]});
        };
      });
    },
    async readRecovery() {
      return atomic(db, ['meta'], 'readonly', (tx, done) => {
        tx.objectStore('meta').get('beforeRestore').onsuccess = event => done(event.target.result?.value || null);
      });
    },
    async restoreBackup(input) {
      const backup = validateBackup(input);
      return atomic(db, ['categories', 'transactions', 'meta'], 'readwrite', (tx, done, abort) => {
        const categories = tx.objectStore('categories'), records = tx.objectStore('transactions');
        const old = {categories:[],records:[]}; let pending = 2;
        const replace = () => {
          if (--pending) return;
          tx.objectStore('meta').put({key:'beforeRestore',value:createBackup(old)});
          categories.clear(); records.clear();
          for (const c of backup.categories) categories.add(c);
          for (const r of backup.records) records.add(r);
          const finish = tx.objectStore('meta').put({key:'lastRestore',value:new Date().toISOString()});
          finish.onsuccess = () => {
            if (testMode && abortNext) { abortNext=false; abort(new Error('T08: فشلت الاستعادة؛ لم تتغير البيانات.')); }
            else done({categories:backup.categories,records:backup.records});
          };
        };
        categories.getAll().onsuccess = event => { old.categories=event.target.result; replace(); };
        records.getAll().onsuccess = event => { old.records=event.target.result; replace(); };
      });
    },
    armAbortNextWrite() {
      if (!testMode) throw new Error('حقن الفشل مسموح في قاعدة الاختبار المعزولة فقط.');
      abortNext = true;
    }
  };
}
export function friendlyError(error) {
  if (error?.name === 'ConstraintError') return 'اسم التصنيف موجود ضمن هذا النوع.';
  if (error?.name === 'QuotaExceededError') return 'مساحة التخزين غير كافية. لم تُحفظ التغييرات.';
  return error?.message || 'تعذر الحفظ. بقيت المدخلات لتعيد المحاولة.';
}
