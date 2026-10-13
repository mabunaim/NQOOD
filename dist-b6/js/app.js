import {parseMoney, formatMoney, todayISO, displayDate, parseDate, monthlyTotals, daysLabel, normalizeDigits} from './domain.js';
import {openDatabase, createRepository, friendlyError, DB_VERSION} from './db.js';
import {BUILD, BUILD_NOTE} from './build-info.js';
import {setupOffline} from './offline.js';
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const testMode = location.pathname.endsWith('/fixtures/t08.html');
const basePath = new URL('./', document.baseURI).pathname;
const dbName = `${testMode ? 'masareek_spike_t08' : 'masareek_spike_db'}:${basePath}`;
let resetOnReturn = false;
let editingCategoryId = '', categoryInitial = '', categoryAction = null;
let repository, offline, offlineError = '', data = {categories: [], records: []};
let page = 'home', entryType = 'expense', categoryType = 'expense', entryId, initial = '', pendingAction = null, busy = false;
const e = (tag, className = '', text) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
const snapshot = () => JSON.stringify(['entry-category', 'entry-amount', 'entry-description', 'entry-date'].map(id => $(id).value));
const dirty = () => page === 'entry' ? snapshot() !== initial : page === 'categories' ? $('category-name').value !== '' : page === 'category-edit' ? $('category-edit-name').value !== categoryInitial : false;
const safeToUpdate = () => !busy && !dirty() && !$('leave-dialog').open && $('category-dialog').hidden && !$('category-action-dialog').open;
function notify(text) { $('message').textContent = text; $('message').hidden = false; }
function setBusy(value) { busy = value; if (!value && resetOnReturn) setTimeout(resetSession, 0); $('entry-fields').disabled = value; $('category-save').disabled = value; $('category-name').disabled = value; $('category-edit-fields').disabled = value; $('category-toggle').disabled = value; $('category-delete').disabled = value; }
function setError(id, error) { $(id).textContent = friendlyError(error); $(id).hidden = false; }
function show(next) {
  if (resetOnReturn) next = 'home';
  page = next;
  for (const p of ['home', 'entry', 'categories', 'category-edit', 'diagnostics']) $(p + '-page').hidden = p !== next;
  $('navigation').hidden = false; $('page-content').scrollTop = 0; $('message').hidden = true;
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
function availableCategories() {
  return data.categories.filter(c => c.active && c.type === entryType).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
}
function closeCategoryPicker() {
  $('category-dialog').hidden = true;
  $('category-picker').setAttribute('aria-expanded', 'false');
}
function selectCategory(category) {
  $('entry-category').value = category.id; closeCategoryPicker(); populateCategories();
}
function populateCategories() {
  const categories = availableCategories();
  const selected = categories.find(c => c.id === $('entry-category').value);
  if (!selected) $('entry-category').value = '';
  $('category-selected').textContent = selected ? `✓ ${selected.name}` : categories.length ? 'اختر التصنيف' : 'أضف تصنيفًا من التعريفات أولًا.';
  $('category-picker').hidden = categories.length <= 4;
  $('category-quick').replaceChildren();
  for (const category of categories.slice(0, 4)) {
    const button = e('button', 'category-chip', category.name); button.type = 'button';
    button.setAttribute('aria-pressed', String(category.id === selected?.id));
    button.onclick = () => selectCategory(category); $('category-quick').append(button);
  }
}
function renderCategoryChoices() {
  const query = $('category-search').value.trim().toLocaleLowerCase('ar');
  const categories = availableCategories();
  const matches = categories.filter(c => c.name.toLocaleLowerCase('ar').includes(query));
  $('category-results').replaceChildren();
  $('category-result-count').textContent = `${matches.length} تصنيفات`;
  if (!matches.length) $('category-results').append(e('p', 'empty', categories.length ? 'لا توجد تصنيفات مطابقة للبحث.' : 'ما في تصنيفات فعّالة. أضف تصنيفًا من التعريفات أولًا.'));
  for (const category of matches) {
    const button = e('button', 'category-choice'); button.type = 'button';
    const selected = category.id === $('entry-category').value;
    button.setAttribute('aria-pressed', String(selected));
    button.append(e('span', '', category.name), e('span', '', selected ? '✓' : ''));
    button.onclick = () => { selectCategory(category); $('category-picker').focus(); };
    $('category-results').append(button);
  }
}
function openCategoryPicker() {
  if (busy) return;
  $('category-search').value = '';
  $('category-dialog-title').textContent = entryType === 'income' ? 'اختر تصنيف الإيراد' : 'اختر تصنيف المصروف';
  renderCategoryChoices(); $('category-picker').setAttribute('aria-expanded', 'true');
  $('category-dialog').hidden = false; $('category-search').focus();
}
function descriptionState() { const filled = $('entry-description').value.trim() !== ''; $('description-state').hidden = !filled; $('entry-description').classList.toggle('filled', filled); }
function openEntry(type) {
  entryType = type; entryId = crypto.randomUUID(); $('entry-form').reset(); $('entry-error').hidden = true;
  $('entry-date').value = displayDate(todayISO()); $('entry-category').value = ''; populateCategories();
  $('entry-title').textContent = type === 'expense' ? 'إضافة مصروف' : 'إضافة إيراد'; $('save-entry').textContent = type === 'expense' ? 'حفظ المصروف' : 'حفظ الإيراد';
  $('entry-description').placeholder = type === 'expense' ? 'مثلًا: خضار' : 'مثلًا: راتب الشهر';
  closeCategoryPicker(); descriptionState(); initial = snapshot(); show('entry'); $('category-quick').querySelector('button')?.focus();
}
async function saveEntry() {
  if (busy) return false;
  $('entry-error').hidden = true;
  let record;
  try {
    if (!$('entry-category').value) throw new Error('اختر التصنيف قبل الحفظ.');
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
$('category-picker').onclick = () => $('category-dialog').hidden ? openCategoryPicker() : closeCategoryPicker();
$('category-search').oninput = renderCategoryChoices;
$('category-close').onclick = () => { closeCategoryPicker(); $('category-picker').focus(); };
$('category-dialog').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeCategoryPicker(); $('category-picker').focus(); } });
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
for (const id of ['entry-amount', 'entry-date']) $(id).addEventListener('input', () => { $(id).value = normalizeDigits($(id).value); });
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
    $('isolated-label').hidden = !testMode; $('arm-failure').hidden = !testMode; $('t08-link').hidden = testMode; $('normal-link').hidden = !testMode;
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
  pendingAction = null; categoryAction = null; closeCategoryPicker();
  for (const dialog of all('dialog[open]')) dialog.close();
  document.activeElement?.blur();
  $('entry-form').reset(); $('entry-category').value = '';
  $('category-form').reset(); $('category-edit-form').reset();
  $('category-search').value = ''; editingCategoryId = ''; categoryInitial = '';
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
