import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openDatabase,createRepository} from '../src/js/db.js';
import {createBackup,parseBackup} from '../src/js/backup.js';
const timestamp='2020-01-01T00:00:00.000Z';
const fixture=()=>createBackup({categories:[{id:'c',name:'Home',type:'expense',active:false,createdAt:timestamp,updatedAt:timestamp}],records:[{id:'r',categoryId:'c',type:'expense',amountFils:5125,date:'2020-01-01',ym:'2020-01',description:'',createdAt:timestamp,updatedAt:timestamp}]});
test('backup roundtrip preserves disabled categories and exact fils',()=>{const b=fixture();assert.deepEqual(parseBackup(JSON.stringify(b)),b);});
test('invalid backup versions, duplicates, references, amounts and dates rejected',()=>{
 for(const change of [b=>b.version=2,b=>b.currency='USD',b=>b.categories.push(b.categories[0]),b=>b.records.push(b.records[0]),b=>b.records[0].categoryId='none',b=>b.records[0].amountFils=1.5,b=>b.records[0].date='2020-02-31',b=>b.records[0].type='income',b=>b.records[0].ym='2020-02']){const b=fixture();change(b);assert.throws(()=>parseBackup(JSON.stringify(b)));}
 assert.throws(()=>parseBackup('{broken'));
});
test('restore replaces atomically, keeps recovery, repeat does not duplicate, abort preserves both',async()=>{
 const db=await openDatabase('backup',new IDBFactory()),repo=createRepository(db,{testMode:true});
 await repo.addCategory({id:'old',type:'income',name:'Salary'});const old=await repo.readAll();
 const b=fixture();await repo.restoreBackup(b);assert.equal((await repo.readAll()).records[0].amountFils,5125);assert.deepEqual((await repo.readRecovery()).categories,old.categories);
 const before=await repo.readAll(),recovery=await repo.readRecovery();repo.armAbortNextWrite();await assert.rejects(repo.restoreBackup(createBackup(old)),/T08/);assert.deepEqual(await repo.readAll(),before);assert.deepEqual(await repo.readRecovery(),recovery);
 const bad=fixture();bad.records[0].categoryId='missing';await assert.rejects(repo.restoreBackup(bad));assert.deepEqual(await repo.readAll(),before);
 await repo.restoreBackup(b);assert.equal((await repo.readAll()).records.length,1);db.close();
});
