import {createBackup, parseBackup} from './backup.js';
import {parseMoney, formatMoney, todayISO, displayDate, parseDate, monthlyTotals, daysLabel, normalizeDigits, categorySummary} from './domain.js';
import {openDatabase, createRepository, friendlyError, DB_VERSION} from './db.js';
import {BUILD, BUILD_NOTE} from './build-info.js';
import {setupOffline} from './offline.js';
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const testMode = location.pathname.endsWith('/fixtures/t08.html');
const basePath = new URL('./', document.baseURI).pathname;
const dbName = `${testMode ? 'masareek_spike_t08' : 'masareek_spike_db'}:${basePath}`;
let resetOnReturn = false, editingRecord = null, deleteRecordId = null, comboIndex = -1;
let editingCategoryId = '', categoryInitial = '', categoryAction = null;
let repository, offline, offlineError = '', data = {categories: [], records: []};
let summaryType = 'expense';
let page = 'home', entryType = 'expense', categoryType = 'expense', entryId, initial = '', pendingAction = null, busy = false;
const e = (tag, className = '', text) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
const snapshot = () => JSON.stringify(['entry-category', 'entry-amount', 'entry-description', 'entry-date'].map(id => $(id).value));
const dirty = () => page === 'entry' ? snapshot() !== initial : page === 'categories' ? $('category-name').value !== '' : page === 'category-edit' ? $('category-edit-name').value !== categoryInitial : false;
const safeToUpdate = () => !pendingBackup && !busy && !dirty() && !$('leave-dialog').open && !$('category-action-dialog').open && !$('record-delete-dialog').open && $('category-popup').hidden;
function notify(text) { $('message').textContent = text; $('message').hidden = false; }
function setBusy(value) { busy = value; if (!value && resetOnReturn) setTimeout(resetSession, 0); $('entry-fields').disabled = value; $('category-save').disabled = value; $('category-name').disabled = value; $('category-edit-fields').disabled = value; $('category-toggle').disabled = value; $('category-delete').disabled = value; }
function setError(id, error) { $(id).textContent = friendlyError(error); $(id).hidden = false; }
function show(next) {
  if (resetOnReturn) next = 'home';
  if (page === 'backup' && next !== 'backup') clearBackupPreview();
  page = next; closeCombo();
  for (const p of ['home', 'entry', 'categories', 'category-edit', 'diagnostics', 'summary', 'summary-detail', 'more', 'definitions', 'backup']) $(p + '-page').hidden = p !== next;
  $('navigation').hidden = next === 'entry'; $('page-content').scrollTop = 0; $('message').hidden = true;
  const activeTab = ['categories','category-edit','definitions','diagnostics','backup'].includes(next) ? 'more' : next === 'summary-detail' ? 'summary' : next;
  all('#navigation [data-page]').forEach(b => { if (b.dataset.page === activeTab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (next === 'home') renderHome();
  if (next === 'backup') refreshRecovery();
  if (next === 'summary') renderSummary();
  if (next === 'categories') renderCategories();
  if (next === 'diagnostics') updateDiagnostics();
}
function guard(action) {
  if (busy) { notify('انتظر اكتمال الحفظ.'); return; }
  if (!dirty()) { action(); return; }
  pendingAction = action; $('leave-dialog').showModal(); $('continue-editing').focus();
}
function clearDraft() {
  if (page === 'entry') { $('entry-form').reset(); }
  if (page === 'categories') $('category-name').value = '';
  if (page === 'category-edit') $('category-edit-name').value = categoryInitial;
}
function monthOptions() {
  const selected = $('month').value || todayISO().slice(0, 7);
  const months = [...new Set([todayISO().slice(0, 7), selected, ...data.records.map(r => r.date.slice(0, 7))])].sort().reverse();
  $('month').replaceChildren();
  const names = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  for (const month of months) { const [year, number] = month.split('-'); $('month').add(new Option(`${names[Number(number) - 1]} ${year}`, month)); }
  $('month').value = selected;
}
function renderHome() {
  monthOptions();
  const month = $('month').value, totals = monthlyTotals(data.records, month);
  $('income-total').textContent = formatMoney(totals.income); $('expense-total').textContent = formatMoney(totals.expense); $('remaining').textContent = formatMoney(totals.remaining);
  $('remaining').classList.toggle('danger', totals.remaining < 0n); $('days').textContent = daysLabel(month);
  const records = data.records.filter(r => r.ym === month).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  $('record-count').textContent = `${records.length} حركات`; $('history').replaceChildren(); $('swipe-hint').hidden = !records.length;
  if (!records.length) { $('history').append(e('p', 'empty', 'ما في حركات لهذا الشهر. ابدأ بإضافة إيراد أو مصروف.')); return; }
  for (const date of [...new Set(records.map(r => r.date))]) {
    const rows = records.filter(r => r.date === date), daily = monthlyTotals(rows, month), section = e('section', 'day'), heading = e('div', 'day-heading');
    heading.append(e('bdi', 'num', displayDate(date)), e('span', '', `إيراد ${formatMoney(daily.income)} · مصروف ${formatMoney(daily.expense)}`)); section.append(heading);
    for (const r of rows) {
      const row = e('div', 'record'), title = e('div'), amount = e('div', 'record-amount');
      title.append(e('div', '', data.categories.find(c => c.id === r.categoryId)?.name || 'تصنيف غير متاح'), e('div', 'small muted', r.description || 'بدون وصف'));
      amount.append(e('bdi', 'num', (r.type === 'income' ? '+' : '−') + formatMoney(r.amountFils)), e('div', 'small muted', r.type === 'income' ? 'إيراد' : 'مصروف')); row.append(title, amount); section.append(swipeRecord(row, r));
    }
    $('history').append(section);
  }
}
function availableCategories() {
  return data.categories.filter(c => (c.active || c.id === editingRecord?.categoryId) && c.type === entryType).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
}
function categoryLabel(c) { return c.name + (c.active ? '' : ' (معطّل)'); }
function populateCategories() {
  const categories = availableCategories(), selected = categories.find(c => c.id === $('entry-category').value);
  if (!selected) $('entry-category').value = '';
  $('category-input').value = selected ? categoryLabel(selected) : '';
  $('category-empty').hidden = categories.length > 0;
}
function closeCombo() {
  $('category-popup').hidden = true; comboIndex = -1;
  $('category-input').setAttribute('aria-expanded','false'); $('category-input').removeAttribute('aria-activedescendant');
  $('category-toggle-list').setAttribute('aria-expanded','false');
  const selected = availableCategories().find(c => c.id === $('entry-category').value);
  $('category-input').value = selected ? categoryLabel(selected) : '';
}
function renderCombo(query = '') {
  const matches = availableCategories().filter(c => c.name.toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar')));
  $('category-options').replaceChildren(); comboIndex = -1; $('category-input').removeAttribute('aria-activedescendant');
  for (const [i,c] of matches.entries()) {
    const option = e('div','combo-option',categoryLabel(c)); option.id = `category-option-${i}`;
    option.setAttribute('role','option'); option.setAttribute('aria-selected',String(c.id === $('entry-category').value));
    option.onpointerdown = event => event.preventDefault();
    option.onclick = () => { $('entry-category').value = c.id; closeCombo(); $('category-input').blur(); };
    $('category-options').append(option);
  }
  $('category-no-results').hidden = matches.length > 0;
  $('category-popup').hidden = false; $('category-input').setAttribute('aria-expanded','true'); $('category-toggle-list').setAttribute('aria-expanded','true');
}
function swipeRecord(row, record) {
  const wrap=e('div','swipe-record'), actions=e('div','record-actions'), more=e('button','record-more','⋯');
  const edit=e('button','record-edit','تعديل'), remove=e('button','record-delete','حذف');
  actions.hidden=true; edit.type=remove.type=more.type='button';
  more.setAttribute('aria-label','خيارات الحركة'); more.setAttribute('aria-expanded','false');
  const close=()=>{row.style.transform='';wrap.classList.remove('revealed');actions.hidden=true;more.setAttribute('aria-expanded','false');};
  wrap.closeActions=close;
  const reveal=sign=>{
    for(const other of all('.swipe-record')) if(other!==wrap)other.closeActions?.();
    actions.style.left=sign>0?'0':'auto';actions.style.right=sign>0?'auto':'0';
    actions.hidden=false;wrap.classList.add('revealed');row.style.transform=`translateX(${sign*144}px)`;more.setAttribute('aria-expanded','true');
  };
  more.onclick=()=>wrap.classList.contains('revealed')?close():reveal(-1);
  edit.onclick=()=>guard(()=>openRecordEditor(record.id));remove.onclick=()=>guard(()=>confirmRecordDelete(record.id));
  actions.append(edit,remove);row.append(more);wrap.append(actions,row);
  let start=null,dragging=false,suppress=false;
  row.onpointerdown=event=>{if(event.target.closest('button')||!event.isPrimary||event.button!==0)return;start={x:event.clientX,y:event.clientY};dragging=false;suppress=false;};
  row.onpointermove=event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(!dragging&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){start=null;return;}if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)*2){dragging=true;row.setPointerCapture(event.pointerId);}};
  row.onpointerup=event=>{if(start&&dragging){const dx=event.clientX-start.x;suppress=true;if(Math.abs(dx)>=80&&Math.abs(dx)>Math.abs(event.clientY-start.y)*2)reveal(Math.sign(dx));else close();}start=null;dragging=false;};
  row.onpointercancel=()=>{start=null;dragging=false;};
  row.addEventListener('click',event=>{if(suppress){suppress=false;event.preventDefault();event.stopPropagation();}else if(!event.target.closest('button')&&wrap.classList.contains('revealed'))close();},true);
  row.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  return wrap;
}
function openRecordEditor(id) {
  const record=data.records.find(r=>r.id===id);if(!record)return;
  openEntry(record.type);editingRecord={...record};entryId=record.id;
  $('entry-category').value=record.categoryId;populateCategories();
  $('entry-amount').value=String(record.amountFils/1000);$('entry-description').value=record.description;$('entry-date').value=record.date;
  $('entry-date').min=record.ym+'-01';const [y,m]=record.ym.split('-').map(Number);const last=new Date(0);last.setUTCFullYear(y,m,0);const end=last.toISOString().slice(0,10);$('entry-date').max=end<todayISO()?end:todayISO();
  $('entry-title').textContent=record.type==='income'?'تعديل الإيراد':'تعديل المصروف';$('save-entry').textContent='حفظ التعديل';
  $('date-help').textContent=`التعديل ضمن شهر ${record.ym} فقط · DD/MM/YYYY`;
  descriptionState();initial=snapshot();
}
function confirmRecordDelete(id) {
  const record=data.records.find(r=>r.id===id);if(!record)return;deleteRecordId=id;
  $('record-delete-details').textContent=`${data.categories.find(c=>c.id===record.categoryId)?.name || ''} · ${formatMoney(record.amountFils)} دينار · ${displayDate(record.date)}${record.description?' · '+record.description:''}`;
  $('record-delete-error').hidden=true;$('record-delete-dialog').showModal();
}
async function deleteSelectedRecord() {
  if(busy||!deleteRecordId)return;const id=deleteRecordId;setBusy(true);$('record-delete-confirm').disabled=true;$('record-delete-cancel').disabled=true;
  try{await repository.deleteRecord(id);data.records=data.records.filter(r=>r.id!==id);deleteRecordId=null;$('record-delete-dialog').close();show('home');notify('تم حذف الحركة وتحديث المجاميع.');}
  catch(error){setError('record-delete-error',error);}
  finally{setBusy(false);$('record-delete-confirm').disabled=false;$('record-delete-cancel').disabled=false;}
}
function descriptionState() { const filled = $('entry-description').value.trim() !== ''; $('description-state').hidden = !filled; $('entry-description').classList.toggle('filled', filled); }
function openEntry(type) {
  editingRecord = null; $('date-help').textContent='اختر التاريخ من التقويم'; $('entry-date').min='0001-01-01'; $('entry-date').max=todayISO(); entryType = type; entryId = crypto.randomUUID(); $('entry-form').reset(); $('entry-error').hidden = true;
  $('entry-date').value = todayISO(); $('entry-category').value = ''; populateCategories();
  $('entry-title').textContent = type === 'expense' ? 'إضافة مصروف' : 'إضافة إيراد'; $('save-entry').textContent = type === 'expense' ? 'حفظ المصروف' : 'حفظ الإيراد';
  $('entry-description').placeholder = type === 'expense' ? 'مثلًا: خضار' : 'مثلًا: راتب الشهر';
  descriptionState(); initial = snapshot(); show('entry'); $('category-toggle-list').focus();
}
async function saveEntry() {
  if (busy) return false;
  $('entry-error').hidden = true;
  let record;
  try {
    if (!$('entry-category').value) throw new Error('اختر التصنيف قبل الحفظ.');
    record = {id: entryId, type: entryType, categoryId: $('entry-category').value, amountFils: parseMoney($('entry-amount').value), date: parseDate(displayDate($('entry-date').value)), description: $('entry-description').value.trim()};
    if (editingRecord && record.date.slice(0,7) !== editingRecord.ym) throw new Error('لا يمكن نقل الحركة إلى شهر آخر.');
    setBusy(true);
    const saved = await (editingRecord ? repository.updateRecord(record) : repository.addRecord(record));
    if (data.records.some(r => r.id === saved.id)) data.records = data.records.map(r => r.id === saved.id ? saved : r); else data.records.push(saved);
  } catch (error) { setError('entry-error', error); return false; }
  finally { setBusy(false); }
  initial = snapshot();
  return true;
}
function savedMessage() { notify(`تم حفظ ${entryType === 'income' ? 'الإيراد' : 'المصروف'} في شهر ${$('entry-date').value.slice(0,7)}.`); }
function renderCategories() {
  all('[data-category-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.categoryType === categoryType)));
  $('category-list').replaceChildren();
  const rows = data.categories.filter(c => c.type === categoryType).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  if (!rows.length) $('category-list').append(e('p', 'empty', 'ما في تصنيفات بعد.'));
  for (const c of rows) {
    const button = e('button', 'category-manage'); button.type = 'button';
    button.append(e('span', '', c.name), e('span', c.active ? 'status-active small' : 'muted small', c.active ? 'فعّال' : 'معطّل'));
    button.onclick = () => guard(() => openCategoryEditor(c.id)); $('category-list').append(button);
  }
}
function openCategoryEditor(id) {
  const c = data.categories.find(c => c.id === id); if (!c) return;
  editingCategoryId = id; categoryInitial = c.name; $('category-edit-name').value = c.name; $('category-edit-error').hidden = true;
  const count = data.records.filter(r => r.categoryId === id).length;
  $('category-edit-meta').textContent = `${c.type === 'income' ? 'إيراد' : 'مصروف'} · ${c.active ? 'فعّال' : 'معطّل'} · ${count} حركات مرتبطة`;
  $('category-toggle').textContent = c.active ? 'تعطيل التصنيف' : 'إعادة تفعيل التصنيف';
  $('category-delete').hidden = count > 0;
  $('category-delete-help').textContent = count ? 'هذا التصنيف مستخدم؛ يمكن تعطيله مع الاحتفاظ بحركاته السابقة.' : 'يمكن حذف التصنيف لأنه غير مرتبط بأي حركة.';
  show('category-edit');
}
async function saveCategoryEditor() {
  if (busy) return false;
  $('category-edit-error').hidden = true; setBusy(true);
  try {
    const saved = await repository.updateCategory(editingCategoryId, {name: $('category-edit-name').value});
    data.categories = data.categories.map(c => c.id === saved.id ? saved : c);
    categoryInitial = saved.name; $('category-edit-name').value = saved.name;
    return true;
  } catch (error) { setError('category-edit-error', error); return false; }
  finally { setBusy(false); }
}
function confirmCategoryAction(kind) {
  const c = data.categories.find(c => c.id === editingCategoryId); if (!c) return;
  categoryAction = {id: c.id, kind, active: !c.active};
  $('category-action-title').textContent = kind === 'delete' ? 'حذف التصنيف؟' : c.active ? 'تعطيل التصنيف؟' : 'إعادة تفعيل التصنيف؟';
  $('category-action-text').textContent = kind === 'delete' ? `سيُحذف «${c.name}» بعد التأكد من عدم ارتباطه بأي حركة.` : c.active ? `سيختفي «${c.name}» من اختيار الحركات الجديدة، وتبقى حركاته السابقة محفوظة.` : `سيعود «${c.name}» للاختيار في الحركات الجديدة بنفس ارتباطاته السابقة.`;
  $('category-action-dialog').showModal();
}
async function applyCategoryAction() {
  if (busy || !categoryAction) return;
  const action = categoryAction; categoryAction = null; $('category-action-dialog').close(); setBusy(true);
  try {
    if (action.kind === 'delete') await repository.deleteCategory(action.id);
    else await repository.updateCategory(action.id, {active: action.active});
    data = await repository.readAll(); show('categories'); notify(action.kind === 'delete' ? 'تم حذف التصنيف.' : action.active ? 'تمت إعادة تفعيل التصنيف.' : 'تم تعطيل التصنيف؛ الحركات السابقة محفوظة.');
  } catch (error) { setError('category-edit-error', error); }
  finally { setBusy(false); }
}
async function saveCategory() {
  if (busy) return false;
  const errorId = 'category-error', input = $('category-name');
  $(errorId).hidden = true; setBusy(true);
  try {
    const saved = await repository.addCategory({id: crypto.randomUUID(), type: categoryType, name: input.value});
    data.categories.push(saved); input.value = '';
    renderCategories();
    return true;
  } catch (error) { setError(errorId, error); return false; }
  finally { setBusy(false); }
}
async function updateDiagnostics() {
  const fields = [['Build', `${BUILD} · ${BUILD_NOTE}`], ['Database version', String(DB_VERSION)], ['Database name', dbName], ['Origin', location.origin], ['حركات / تصنيفات', `${data.records.length} / ${data.categories.length}`], ['التشغيل', matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'Home Screen / Standalone' : 'Browser']];
  try {
    if (offline) { const s = await offline.status(); fields.push(['ملفات Offline', s.ready ? 'جاهزة' : 'غير جاهزة'], ['الأصول المخزنة / المطلوبة', `${s.cached} / ${s.expected}`], ['Service Worker build', s.build]); }
    else fields.push(['ملفات Offline', offlineError || 'جارٍ التجهيز']);
    fields.push(['Persistent storage', navigator.storage?.persisted ? String(await navigator.storage.persisted()) : 'غير مدعوم']);
  } catch (error) { fields.push(['نتيجة الفحص', friendlyError(error)]); }
  $('diagnostics').replaceChildren();
  for (const [key, value] of fields) { const row = e('div'); row.append(e('dt', '', key), e('dd', '', value)); $('diagnostics').append(row); }
}
all('[data-page]').forEach(b => b.addEventListener('click', () => guard(() => show(b.dataset.page))));
all('[data-category-type]').forEach(b => b.addEventListener('click', () => { if (b.dataset.categoryType !== categoryType) guard(() => { categoryType = b.dataset.categoryType; renderCategories(); }); }));
$('add-expense').onclick = () => openEntry('expense'); $('add-income').onclick = () => openEntry('income');
$('close-entry').onclick = () => guard(() => show('home'));
$('entry-form').onsubmit = async event => { event.preventDefault(); if (await saveEntry()) { show('home'); savedMessage(); } };
$('category-edit-close').onclick = () => guard(() => show('categories'));
$('category-edit-form').onsubmit = async event => { event.preventDefault(); if (await saveCategoryEditor()) { show('categories'); notify('تم تعديل اسم التصنيف.'); } };
$('category-toggle').onclick = () => guard(() => confirmCategoryAction('toggle'));
$('category-delete').onclick = () => guard(() => confirmCategoryAction('delete'));
$('category-action-confirm').onclick = applyCategoryAction;
$('category-action-cancel').onclick = () => { categoryAction = null; $('category-action-dialog').close(); };
$('category-action-dialog').addEventListener('cancel', () => { categoryAction = null; });
$('category-form').onsubmit = async event => { event.preventDefault(); if (await saveCategory()) notify('تم حفظ التصنيف.'); };
$('entry-description').oninput = descriptionState;
for (const id of ['entry-amount']) $(id).addEventListener('input', () => { $(id).value = normalizeDigits($(id).value); });
$('month').onchange = renderHome;
$('leave-dialog').addEventListener('cancel', event => { event.preventDefault(); pendingAction = null; $('leave-dialog').close(); });
$('continue-editing').onclick = () => { pendingAction = null; $('leave-dialog').close(); };
$('discard').onclick = () => { const action = pendingAction; pendingAction = null; $('leave-dialog').close(); clearDraft(); action?.(); };
$('save-leave').onclick = async () => {
  const action = pendingAction; pendingAction = null; $('leave-dialog').close();
  const wasEntry = page === 'entry';
  if (await (wasEntry ? saveEntry() : page === 'category-edit' ? saveCategoryEditor() : saveCategory())) { action?.(); if (wasEntry) savedMessage(); }
};
$('refresh-diagnostics').onclick = async () => { try { data = await repository.readAll(); await updateDiagnostics(); } catch (error) { notify(friendlyError(error)); } };
$('check-update').onclick = async () => { try { if (!offline) throw new Error(offlineError || 'التجهيز لم يكتمل بعد.'); await offline.check(); notify('اكتمل طلب التحقق. سيظهر إشعار إذا توفر تحديث.'); } catch (error) { notify(friendlyError(error)); } };
$('install-update').onclick = () => guard(async () => { try { await offline.activate(); } catch (error) { notify(friendlyError(error)); } });
$('request-persistence').onclick = async () => { try { const result = await navigator.storage?.persist?.(); notify(result ? 'وافق المتصفح على طلب الاحتفاظ؛ تظل النسخة الخارجية ضرورية.' : 'لم يُمنح الطلب أو الميزة غير متاحة.'); await updateDiagnostics(); } catch (error) { notify(friendlyError(error)); } };
$('arm-failure').onclick = () => { repository.armAbortNextWrite(); notify('سيُلغى الحفظ التالي بعد تنفيذ طلب الكتابة داخل معاملة اختبارية.'); };
window.addEventListener('pageshow', async () => { if (repository && !dirty() && !busy) { try { data = await repository.readAll(); if (page === 'home') renderHome(); } catch (error) { notify(friendlyError(error)); } } });
async function init() {
  try {
    repository = createRepository(await openDatabase(dbName), {testMode}); data = await repository.readAll();
    $('startup').hidden = true; $('workspace').hidden = false;
    $('isolated-label').hidden = !testMode; $('arm-failure').hidden = !testMode; $('t08-link').hidden = true; $('normal-link').hidden = !testMode;
    show('home');
    setupOffline({safeToUpdate, onWaiting: waiting => { $('update-banner').hidden = !waiting; }, onChanged: () => { if (page === 'diagnostics') updateDiagnostics(); }})
      .then(value => { offline = value; if (page === 'diagnostics') updateDiagnostics(); })
      .catch(error => { offlineError = friendlyError(error); if (page === 'diagnostics') updateDiagnostics(); });
  } catch (error) { $('startup').textContent = 'تعذر فتح البيانات: ' + friendlyError(error) + ' أعد فتح التطبيق بعد معالجة السبب.'; $('startup').setAttribute('role', 'alert'); }
}
init();

// Match the visible viewport when the mobile keyboard opens; do not override pinch zoom.
function syncViewport() {
  const viewport = window.visualViewport;
  if (viewport && viewport.scale === 1) {
    document.documentElement.style.setProperty('--app-height', `${viewport.height}px`);
    document.documentElement.style.setProperty('--app-top', `${viewport.offsetTop}px`);
  }
}
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
window.addEventListener('resize', syncViewport);
syncViewport();

// Backgrounding ends the editing session. Only committed data survives.
function resetSession() {
  if (!repository || busy) return;
  pendingAction = null; categoryAction = null; deleteRecordId = null; editingRecord = null; closeCombo();
  for (const dialog of all('dialog[open]')) dialog.close();
  document.activeElement?.blur();
  $('entry-form').reset(); $('entry-category').value = '';
  $('category-form').reset(); $('category-edit-form').reset();
 editingCategoryId = ''; categoryInitial = '';
  for (const error of all('.error')) error.hidden = true;
  descriptionState(); initial = snapshot();
  show('home');
  if (document.visibilityState === 'visible') resetOnReturn = false;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') resetOnReturn = true;
  if (resetOnReturn) resetSession();
});
window.addEventListener('pagehide', () => { resetOnReturn = true; resetSession(); });
window.addEventListener('pageshow', event => { if (event.persisted || resetOnReturn) resetSession(); });

$('category-toggle-list').onclick = () => $('category-popup').hidden ? renderCombo() : closeCombo();
$('category-input').onclick = () => { if($('category-popup').hidden){renderCombo();$('category-input').select();} };
$('category-input').oninput = () => renderCombo($('category-input').value);
$('category-input').onkeydown = event => {
  if(event.key==='Escape'){closeCombo();return;}
  if(event.key==='Tab'){closeCombo();return;}
  if(['ArrowDown','ArrowUp'].includes(event.key)){
    event.preventDefault();if($('category-popup').hidden)renderCombo();
    const options=all('#category-options [role="option"]');if(!options.length)return;
    comboIndex=(comboIndex+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
    options.forEach((o,i)=>o.classList.toggle('keyboard-active',i===comboIndex));
    $('category-input').setAttribute('aria-activedescendant',options[comboIndex].id);options[comboIndex].scrollIntoView({block:'nearest'});
  }else if(event.key==='Enter'&&!$('category-popup').hidden){event.preventDefault();all('#category-options [role="option"]')[comboIndex]?.click();}
};
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#category-combo'))closeCombo();});
$('record-delete-confirm').onclick=deleteSelectedRecord;
$('record-delete-cancel').onclick=()=>{deleteRecordId=null;$('record-delete-dialog').close();};
$('record-delete-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();else deleteRecordId=null;});

all('[data-back]').forEach(button=>button.onclick=()=>guard(()=>show(button.dataset.back)));
function summaryMonths() {
  const selected=$('summary-month').value || todayISO().slice(0,7), months=new Set([selected,...data.records.map(r=>r.ym)]);
  const now=new Date();for(let i=0;i<12;i++){const date=new Date(now.getFullYear(),now.getMonth()-i,1);months.add(todayISO(date).slice(0,7));}
  $('summary-month').replaceChildren();
  for(const month of [...months].sort().reverse()){
    const [year,m]=month.split('-');const names=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    $('summary-month').add(new Option(`${names[Number(m)-1]} ${year}`,month));
  }
  $('summary-month').value=selected;
}
function selectSummaryType(type, resetScroll = false) {
  summaryType=type;
  for(const item of ['expense','income']) {
    $(item+'-panel').hidden=item!==type;
    $('summary-tab-'+item).setAttribute('aria-pressed',String(item===type));
  }
  if(resetScroll)$('page-content').scrollTop=0;
}
all('[data-summary-type]').forEach(button=>button.onclick=()=>selectSummaryType(button.dataset.summaryType,true));
function renderSummary() {
  selectSummaryType(summaryType);
  summaryMonths();const month=$('summary-month').value, totals=monthlyTotals(data.records,month);
  for(const key of ['income','expense','remaining'])$('summary-'+key).textContent=formatMoney(totals[key]);
  $('summary-remaining').classList.toggle('danger',totals.remaining<0n);
  for(const type of ['expense','income']){
    const target=$(type+'-breakdown');target.replaceChildren();const groups=categorySummary(data.records,data.categories,month,type);
    $(type+'-category-count').textContent=`${groups.length} تصنيفات`;
    if(!groups.length){target.append(e('p','empty',type==='expense'?'لا توجد مصروفات لهذا الشهر.':'لا توجد إيرادات لهذا الشهر.'));continue;}
    for(const group of groups){
      const button=e('button','breakdown-row');button.type='button';button.dataset.categoryId=group.id;
      const heading=e('span','breakdown-heading');heading.append(e('span','',group.name),e('bdi','num',formatMoney(group.amount)+' دينار'));
      const footer=e('span','breakdown-footer');footer.append(e('span','',`${group.count} حركات`),e('bdi','num',`${group.percent}%`));
      const track=e('span','bar-track'),bar=e('span','bar-fill');bar.style.width=group.percent+'%';track.setAttribute('aria-hidden','true');track.append(bar);
      button.append(heading,track,footer);button.onclick=()=>openSummaryDetail(group,month,type);target.append(button);
    }
  }
}
function openSummaryDetail(group,month,type){
  $('summary-detail-title').textContent=group.name;$('summary-detail-meta').textContent=`${month} · ${formatMoney(group.amount)} دينار · ${group.count} حركات`;
  const target=$('summary-detail-list');target.replaceChildren();
  const records=data.records.filter(r=>r.ym===month&&r.type===type&&r.categoryId===group.id).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
  for(const record of records){const row=e('div','summary-detail-row'),text=e('div');text.append(e('div','',record.description||'بدون وصف'),e('bdi','num small muted',displayDate(record.date)));row.append(text,e('bdi','num',formatMoney(record.amountFils)+' دينار'));target.append(row);}
  show('summary-detail');
}
$('summary-month').onchange=renderSummary;

$('entry-date').addEventListener('click',()=>{try{$('entry-date').showPicker?.();}catch{/* Native picker remains available. */}});

let pendingBackup = null, backupReadToken = 0;
function clearBackupPreview() {
  backupReadToken++; pendingBackup=null; $('backup-preview').hidden=true;
  $('backup-file').value=''; $('backup-consent').checked=false; $('backup-restore').disabled=true;
}
async function refreshRecovery() {
  try { $('backup-recovery').hidden=!(await repository.readRecovery()); } catch(error) { notify(friendlyError(error)); }
}
function downloadBackup(backup, prefix='masareek') {
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url; link.download=`${prefix}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
}
$('backup-export').onclick=async()=>{
  if(busy)return;
  try { downloadBackup(createBackup(await repository.readAll())); $('backup-status').textContent='تم تجهيز الملف. تأكد من حفظه في تطبيق الملفات (Files).'; }
  catch(error){$('backup-status').textContent=friendlyError(error);}
};
$('backup-recovery').onclick=async()=>{
  try { const backup=await repository.readRecovery(); if(backup)downloadBackup(backup,'masareek-before-restore'); }
  catch(error){$('backup-status').textContent=friendlyError(error);}
};
$('backup-file').onchange=async()=>{
  const file=$('backup-file').files[0]; clearBackupPreview(); const token=backupReadToken;
  if(!file)return;
  try {
    if(file.size>20000000)throw new Error('حجم الملف يتجاوز 20 MB.');
    const backup=parseBackup(await file.text());
    if(token!==backupReadToken)return;
    resetOnReturn=false; show('backup'); pendingBackup=backup;
    $('backup-status').textContent='تم فحص الملف. لم تتغير البيانات بعد.';
    $('backup-details').textContent=`التصنيفات: ${backup.categories.length} · الحركات: ${backup.records.length} · تاريخ النسخة: ${backup.exportedAt.slice(0,10)}`;
    $('backup-preview').hidden=false;
  }catch(error){$('backup-status').textContent=friendlyError(error);}
};
$('backup-consent').onchange=()=>{$('backup-restore').disabled=!$('backup-consent').checked;};
$('backup-cancel').onclick=()=>{clearBackupPreview();$('backup-status').textContent='أُلغيت الاستعادة؛ لم تتغير البيانات.';};
$('backup-restore').onclick=async()=>{
  if(busy||!pendingBackup||!$('backup-consent').checked)return;
  setBusy(true); $('backup-restore').disabled=true; $('backup-cancel').disabled=true; $('backup-file').disabled=true;
  try { data=await repository.restoreBackup(pendingBackup);clearBackupPreview();show('home');notify('تمت الاستعادة بنجاح. نسخة الأمان السابقة متاحة في النسخ الاحتياطي.'); }
  catch(error){$('backup-status').textContent=friendlyError(error);}
  finally{setBusy(false);$('backup-restore').disabled=!pendingBackup||!$('backup-consent').checked;$('backup-cancel').disabled=false;$('backup-file').disabled=false;}
};
