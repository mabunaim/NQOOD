export function requestWorker(worker, message, timeout = 6000) {
  return new Promise((resolve, reject) => {
    if (!worker) { reject(new Error('عامل التشغيل دون إنترنت غير جاهز.')); return; }
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('انتهت مهلة فحص التشغيل دون إنترنت.')); }, timeout);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    worker.postMessage(message, [channel.port2]);
  });
}
export async function setupOffline({safeToUpdate, onWaiting, onChanged}) {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('يلزم HTTPS، أو localhost على الكمبيوتر، لتجهيز العمل دون إنترنت.');
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'CAN_UPDATE') event.ports[0]?.postMessage({safe: safeToUpdate()});
  });
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && safeToUpdate()) location.reload();
    else { hadController = true; onChanged(); }
  });
  const registration = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI), {scope: new URL('./', document.baseURI).pathname, updateViaCache: 'none'});
  const check = () => onWaiting(!!registration.waiting);
  check();
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => { check(); onChanged(); });
  });
  await navigator.serviceWorker.ready;
  check(); onChanged();
  return {
    async status() {
      if (!navigator.serviceWorker.controller) return {ready: false, cached: 0, expected: 0, build: '—'};
      const status = await requestWorker(navigator.serviceWorker.controller, {type: 'STATUS'});
      return {...status, ready: status.cached === status.expected && status.expected > 0};
    },
    async check() { await registration.update(); check(); },
    async activate() {
      if (!safeToUpdate()) throw new Error('احفظ التغييرات أو تجاهلها قبل التحديث.');
      if (!registration.waiting) { check(); throw new Error('لا يوجد تحديث جاهز للتفعيل الآن.'); }
      const result = await requestWorker(registration.waiting, {type: 'ACTIVATE'});
      if (!result.ok) throw new Error('تعذر التفعيل. احفظ التغييرات أو أغلق نوافذ التطبيق الأخرى ثم أعد المحاولة.');
    }
  };
}
