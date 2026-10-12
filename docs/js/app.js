import {parseMoney, formatMoney, todayISO, displayDate, parseDate, monthlyTotals, daysLabel, normalizeDigits} from './domain.js';
import {openDatabase, createRepository, friendlyError, DB_VERSION} from './db.js';
import {BUILD, BUILD_NOTE} from './build-info.js';
import {setupOffline} from './offline.js';
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const testMode = location.pathname.endsWith('/fixtures/t08.html');
const basePath = new URL('./', document.baseURI).pathname;
const dbName = `${testMode ? 'masareek_spike_t08' : 'masareek_spike_db'}:${basePath}`;
let repository, offline, offlineError = '', data = {categories: [], records: []};
let page = 'home', entryType = 'expense', categoryType = 'expense', entryId, initial = '', pendingAction = null, busy = false;
const e = (tag, className = '', text) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
const snapshot = () => JSON.stringify(['entry-category', 'entry-amount', 'entry-description', 'entry-date', 'inline-name'].map(id => $(id).value));
const dirty = () => page === 'entry' ? snapshot() !== initial : page === 'categories' ? $('category-name').value !== '' : false;
const safeToUpdate = () => !busy && !dirty() && !$('leave-dialog').open;
function notify(text) { $('message').textContent = text; $('message').hidden = false; }
function setBusy(value) { busy = value; $('entry-fields').disabled = value; $('category-save').disabled = value; $('category-name').disabled = value; }
function setError(id, error) { $(id).textContent = friendlyError(error); $(id).hidden = false; }
function show(next) {
  page = next;
  for (const p of ['home', 'entry', 'categories', 'diagnostics']) $(p + '-page').hidden = p !== next;
  $('navigation').hidden = next === 'entry'; $('message').hidden = true;
  all('[data-page]').forEach(b => { if (b.dataset.page === next) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (next === 'home') renderHome();
  if (next === 'categories') renderCategories();
  if (next === 'diagnostics') updateDiagnostics();
}
function guard(action) {
  if (busy) { notify('انتظر اكتمال الحفظ.'); return; }
  if (!dirty()) { action(); return; }
  pendingAction = action; $('leave-dialog').showModal(); $('continue-editing').focus();
}
function clearDraft() {
  if (page === 'entry') { $('entry-form').reset(); $('inline-name').value = ''; }
  if (page === 'categories') $('category-name').value = '';
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
  $('record-count').textContent = `${records.length} حركات`; $('history').replaceChildren();
  if (!records.length) { $('history').append(e('p', 'empty', 'ما في حركات لهذا الشهر. ابدأ بإضافة إيراد أو مصروف.')); return; }
  for (const date of [...new Set(records.map(r => r.date))]) {
    const rows = records.filter(r => r.date === date), daily = monthlyTotals(rows, month), section = e('section', 'day'), heading = e('div', 'day-heading');
    heading.append(e('bdi', 'num', displayDate(date)), e('span', '', `إيراد ${formatMoney(daily.income)} · مصروف ${formatMoney(daily.expense)}`)); section.append(heading);
    for (const r of rows) {
      const row = e('div', 'record'), title = e('div'), amount = e('div', 'record-amount');
      title.append(e('div', '', data.categories.find(c => c.id === r.categoryId)?.name || 'تصنيف غير متاح'), e('div', 'small muted', r.description || 'بدون وصف'));
      amount.append(e('bdi', 'num', (r.type === 'income' ? '+' : '−') + formatMoney(r.amountFils)), e('div', 'small muted', r.type === 'income' ? 'إيراد' : 'مصروف')); row.append(title, amount); section.append(row);
    }
    $('history').append(section);
  }
}
function populateCategories() {
  const selected = $('entry-category').value; $('entry-category').replaceChildren(new Option('اختر التصنيف', ''));
  data.categories.filter(c => c.active && c.type === entryType).sort((a,b) => a.name.localeCompare(b.name, 'ar')).forEach(c => $('entry-category').add(new Option(c.name, c.id)));
  $('entry-category').value = selected;
}
function descriptionState() { const filled = $('entry-description').value.trim() !== ''; $('description-state').hidden = !filled; $('entry-description').classList.toggle('filled', filled); }
function openEntry(type) {
  entryType = type; entryId = crypto.randomUUID(); $('entry-form').reset(); $('inline-name').value = ''; $('inline-box').hidden = true; $('inline-error').hidden = true; $('entry-error').hidden = true;
  $('entry-date').value = displayDate(todayISO()); populateCategories(); $('entry-category').value = '';
  $('entry-title').textContent = type === 'expense' ? 'إضافة مصروف' : 'إضافة إيراد'; $('save-entry').textContent = type === 'expense' ? 'حفظ المصروف' : 'حفظ الإيراد';
  $('entry-description').placeholder = type === 'expense' ? 'مثلًا: خضار' : 'مثلًا: راتب الشهر';
  descriptionState(); initial = snapshot(); show('entry'); $('entry-category').focus();
}
async function saveEntry() {
  if (busy) return false;
  $('entry-error').hidden = true;
  let record;
  try {
    if (!$('entry-category').value) throw new Error('اختر التصنيف قبل الحفظ.');
    if ($('inline-name').value.trim()) throw new Error('أضف التصنيف المكتوب أو ألغِ إضافته قبل حفظ الحركة.');
    record = {id: entryId, type: entryType, categoryId: $('entry-category').value, amountFils: parseMoney($('entry-amount').value), date: parseDate($('entry-date').value), description: $('entry-description').value.trim()};
    setBusy(true);
    const saved = await repository.addRecord(record);
    if (!data.records.some(r => r.id === saved.id)) data.records.push(saved);
  } catch (error) { setError('entry-error', error); return false; }
  finally { setBusy(false); }
  initial = snapshot();
  return true;
}
function savedMessage() { notify(`تم حفظ ${entryType === 'income' ? 'الإيراد' : 'المصروف'} في شهر ${$('entry-date').value.slice(3)}.`); }
function renderCategories() {
  all('[data-category-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.categoryType === categoryType)));
  $('category-list').replaceChildren();
  const rows = data.categories.filter(c => c.type === categoryType).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  if (!rows.length) $('category-list').append(e('p', 'empty', 'ما في تصنيفات بعد.'));
  for (const c of rows) $('category-list').append(e('div', '', c.name));
}
async function saveCategory(inline = false) {
  if (busy) return false;
  const errorId = inline ? 'inline-error' : 'category-error', input = inline ? $('inline-name') : $('category-name');
  $(errorId).hidden = true; setBusy(true);
  try {
    const saved = await repository.addCategory({id: crypto.randomUUID(), type: inline ? entryType : categoryType, name: input.value});
    data.categories.push(saved); input.value = '';
    if (inline) { populateCategories(); $('entry-category').value = saved.id; $('inline-box').hidden = true; }
    else renderCategories();
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
$('category-form').onsubmit = async event => { event.preventDefault(); if (await saveCategory()) notify('تم حفظ التصنيف.'); };
$('inline-add').onclick = () => { $('inline-box').hidden = false; $('inline-name').focus(); };
$('inline-cancel').onclick = () => { $('inline-box').hidden = true; $('inline-name').value = ''; $('inline-error').hidden = true; };
$('inline-save').onclick = () => saveCategory(true);
$('entry-description').oninput = descriptionState;
for (const id of ['entry-amount', 'entry-date']) $(id).addEventListener('input', () => { $(id).value = normalizeDigits($(id).value); });
$('month').onchange = renderHome;
$('leave-dialog').addEventListener('cancel', event => { event.preventDefault(); pendingAction = null; $('leave-dialog').close(); });
$('continue-editing').onclick = () => { pendingAction = null; $('leave-dialog').close(); };
$('discard').onclick = () => { const action = pendingAction; pendingAction = null; $('leave-dialog').close(); clearDraft(); action?.(); };
$('save-leave').onclick = async () => {
  const action = pendingAction; pendingAction = null; $('leave-dialog').close();
  const wasEntry = page === 'entry';
  if (await (wasEntry ? saveEntry() : saveCategory())) { action?.(); if (wasEntry) savedMessage(); }
};
$('refresh-diagnostics').onclick = async () => { try { data = await repository.readAll(); await updateDiagnostics(); } catch (error) { notify(friendlyError(error)); } };
$('check-update').onclick = async () => { try { if (!offline) throw new Error(offlineError || 'التجهيز لم يكتمل بعد.'); await offline.check(); notify('اكتمل طلب التحقق. سيظهر إشعار إذا توفر تحديث.'); } catch (error) { notify(friendlyError(error)); } };
$('install-update').onclick = () => guard(async () => { try { await offline.activate(); } catch (error) { notify(friendlyError(error)); } });
$('request-persistence').onclick = async () => { try { const result = await navigator.storage?.persist?.(); notify(result ? 'وافق المتصفح على طلب الاحتفاظ؛ تظل النسخة الخارجية ضرورية.' : 'لم يُمنح الطلب أو الميزة غير متاحة.'); await updateDiagnostics(); } catch (error) { notify(friendlyError(error)); } };
$('arm-failure').onclick = () => { repository.armAbortNextWrite(); notify('سيُلغى الحفظ التالي بعد تنفيذ طلب الكتابة داخل معاملة اختبارية.'); };
window.addEventListener('beforeunload', event => { if (dirty() || busy) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pageshow', async () => { if (repository && !dirty() && !busy) { try { data = await repository.readAll(); if (page === 'home') renderHome(); } catch (error) { notify(friendlyError(error)); } } });
async function init() {
  try {
    repository = createRepository(await openDatabase(dbName), {testMode}); data = await repository.readAll();
    $('startup').hidden = true; $('workspace').hidden = false;
    $('isolated-label').hidden = !testMode; $('arm-failure').hidden = !testMode; $('t08-link').hidden = testMode; $('normal-link').hidden = !testMode;
    show('home');
    setupOffline({safeToUpdate, onWaiting: waiting => { $('update-banner').hidden = !waiting; }, onChanged: () => { if (page === 'diagnostics') updateDiagnostics(); }})
      .then(value => { offline = value; if (page === 'diagnostics') updateDiagnostics(); })
      .catch(error => { offlineError = friendlyError(error); if (page === 'diagnostics') updateDiagnostics(); });
  } catch (error) { $('startup').textContent = 'تعذر فتح البيانات: ' + friendlyError(error) + ' أعد فتح التطبيق بعد معالجة السبب.'; $('startup').setAttribute('role', 'alert'); }
}
init();
