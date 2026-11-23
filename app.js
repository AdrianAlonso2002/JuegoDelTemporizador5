(() => {
  'use strict';
  const config = window.ADVENT_CONFIG;
  const $ = selector => document.querySelector(selector);
  const key = `para-ti-advent-${config.year}`;
  const samples = {
    letter: { title: 'Unas palabras para ti', text: 'Este sobre está esperando una carta tuya: algo que admiras de ella, una pequeña anécdota o un motivo por el que la eliges cada día.' },
    photo: { title: 'De nuestra pequeña colección', text: 'Este regalo está reservado para una foto vuestra y la historia que hay detrás.' },
    plan: { title: 'Una cita pendiente', text: 'Aquí puedes esconder un plan para compartir: una merienda, un paseo con luces de Navidad o cocinar juntos vuestra cena favorita.' }
  };
  const types = ['letter', 'photo', 'plan'];
  function content(day) {
    return config.days.find(item => item.day === day) || { day, type: types[(day - 1) % types.length], image: '', ...samples[types[(day - 1) % types.length]] };
  }
  const rules = window.AdventState.createRules(config, content);
  let realState = window.AdventState.empty();
  try { realState = rules.restore(JSON.parse(localStorage.getItem(key) || 'null')); } catch { /* Fall back to an empty calendar if storage is unavailable. */ }
  let demoState = window.AdventState.empty();
  let preview = false;
  let activeDay = null;
  let animationTimer;
  let toastTimer;
  let waitImageIndex = 0;
  const snowNodes = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = () => preview ? demoState : realState;
  const status = day => rules.status(day, state(), new Date(), preview);
  const isOpen = day => state().opened.includes(day);
  const isComplete = day => state().completed.includes(day);
  const birthdayWrapped = () => isComplete(29);
  const formatDate = day => rules.dateFor(day).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const lock = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor"/></svg>';
  const ribbon = '<span class="tile-ribbon-v"></span><span class="tile-ribbon-h"></span><span class="tile-bow"></span>';

  function persist() {
    if (preview) return;
    try { localStorage.setItem(key, JSON.stringify(realState)); }
    catch { notify('El navegador no permite guardar el progreso en este dispositivo.'); }
  }
  function notify(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
  }
  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.vendor || window.opera);
  }

  function checkDailyNotification() {
    if (!isMobileDevice()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const today = new Date();
    // Only in December 2026 or Birthday
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const notifiedKey = `para-ti-notified-${todayStr}`;
    if (localStorage.getItem(notifiedKey)) return;

    const next = state().completed.length + 1;
    if (next > 30) return;
    if (status(next) === 'available') {
      try {
        new Notification(next === 30 ? '¡Feliz Cumpleaños! 🎂' : `¡Tu regalo del día ${next} te espera! 🎁`, {
          body: next === 30 ? 'Hoy tienes preparado tu regalo especial de cumpleaños. ♡' : `Tienes el regalito del día ${next} listo para abrir hoy. ¡Ven a descubrirlo! ♡`,
          icon: 'assets/gift-icon.svg',
          badge: 'assets/gift-icon.svg',
          tag: 'daily-gift'
        });
        localStorage.setItem(notifiedKey, 'true');
      } catch { /* Silent fail */ }
    }
  }

  function requestNotificationPermission() {
    if (!isMobileDevice()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') checkDailyNotification();
      });
    } else if (Notification.permission === 'granted') {
      checkDailyNotification();
    }
  }

  function blockedMessage(day) {
    const pending = state().opened.find(openedDay => !isComplete(openedDay));
    if (pending) return `Este regalo todavía no se puede abrir. Primero resuelve el reto del día ${pending}; su foto y el siguiente regalo te esperan al acertar. Tienes que abrir la caja correspondiente. ♡`;
    if (status(day) === 'date') return `Este regalo te espera el ${formatDate(day)}. Ya has llegado a su turno, pero aún tiene que llegar su fecha. Un poquito de paciencia. ♡`;
    const next = state().completed.length + 1;
    const when = status(next) === 'date' ? ` Estará disponible el ${formatDate(next)}.` : '';
    return `Todavía no puedes abrir ${day === 30 ? 'el regalo de cumpleaños' : `el día ${day}`}. Tienes que abrir la caja correspondiente: el día ${next}.${when} Vamos poquito a poco. ♡`;
  }
  function showBlocked(day) {
    activeDay = day;
    const container = $('#dialog-content');
    container.replaceChildren(element('p', 'eyebrow', 'UN POQUITO DE PACIENCIA'));
    const heading = element('h2', '', 'Cada regalo tiene su momento');
    heading.id = 'dialog-title';
    container.append(heading);
    const images = config.waitImages || [];
    if (images.length) appendImage(container, { ...images[waitImageIndex++ % images.length], displayHeight: 28, allowFullPhoto: false });
    container.append(element('p', 'blocked-explanation', blockedMessage(day)));
    const next = Math.min(30, state().completed.length + 1);
    const close = element('button', 'dialog-action', status(day) === 'date' ? 'Volver al calendario' : next === 30 ? 'Ir a cumpleaños' : `Ir al día ${next}`);
    close.addEventListener('click', () => {
      activeDay = next;
      closeDialog();
      $(`.day[data-day="${next}"]`)?.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
    container.append(close);
    showDialog();
  }
  function clearOpenBurst() {
    const layer = $('#dialog-sparkles');
    if (layer) layer.replaceChildren();
  }

  function spawnOpenBurst() {
    clearOpenBurst();
    if (reducedMotion.matches) return;
    const dialog = $('#gift-dialog');
    const layer = $('#dialog-sparkles');
    const gift = $('#unwrap-button');
    if (!dialog.open || !gift || !layer) return;

    // Posiciones RELATIVAS a la ventana del regalo, nunca al viewport.
    // Los destellos se recortan dentro del propio diálogo y no alteran su tamaño.
    const bounds = dialog.getBoundingClientRect();
    const giftBounds = gift.getBoundingClientRect();
    const originX = Math.max(0, Math.min(bounds.width, giftBounds.left + giftBounds.width / 2 - bounds.left));
    const originY = Math.max(0, Math.min(bounds.height, giftBounds.top + giftBounds.height / 2 - bounds.top));
    const colors = ['#fce498', '#ffd700', '#fff3b0', '#e8f5e9', '#81c784', '#ff8a80', '#ffffff', '#e0f7fa'];
    const glyphs = ['✦', '✧', '✶', '✷', '★'];
    const count = 48;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'burst-sparkle';
      el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      const angle = 2 * Math.PI * i / count + (Math.random() - .5) * .36;
      const radius = 25 + Math.random() * Math.min(95, bounds.width * .19);
      const burstX = Math.cos(angle) * radius;
      const burstY = Math.sin(angle) * radius * .7 - 12;
      const fallY = Math.max(100, bounds.height - originY + 35);
      const driftX = burstX + (Math.random() - .5) * 60;
      el.style.setProperty('--startX', `${originX}px`);
      el.style.setProperty('--startY', `${originY}px`);
      el.style.setProperty('--burstX', `${burstX}px`);
      el.style.setProperty('--burstY', `${burstY}px`);
      el.style.setProperty('--driftX', `${driftX}px`);
      el.style.setProperty('--fallDist', `${fallY}px`);
      el.style.setProperty('--sparkleSize', `${11 + Math.random() * 11}px`);
      el.style.setProperty('--sparkleColor', colors[Math.floor(Math.random() * colors.length)]);
      // Todos permanecen exactamente diez segundos y se desvanecen al caer.
      fragment.append(el);
    }
    const particles = Array.from(fragment.childNodes);
    layer.append(fragment);
    setTimeout(() => {
      // No borrar destellos de una apertura posterior.
      particles.forEach(el => el.remove());
    }, 10000);
  }

  function syncSnow(freshDay) {
    const days = state().opened.filter(day => day <= 29);
    for (const [day, node] of snowNodes) {
      if (!days.includes(day)) { node.remove(); snowNodes.delete(day); }
    }
    for (const day of days) {
      if (snowNodes.has(day)) continue;
      const node = document.createElement('span');
      node.className = 'snow-star';
      node.dataset.day = day;
      node.style.setProperty('--left', `${2 + (day * 37) % 94}vw`);
      node.style.setProperty('--duration', `${54 + (day * 7) % 31}s`);
      node.style.setProperty('--delay', freshDay === day ? '0s' : `-${(day * 13) % 53}s`);
      node.style.setProperty('--drift', `${(day % 2 ? 1 : -1) * (14 + day % 5 * 5)}px`);
      node.style.setProperty('--size', `${14 + day % 4 * 3}px`);
      node.style.setProperty('--star-color', `hsl(${(day * 137.508 + 335) % 360} 37% 56%)`);
      node.innerHTML = '<span>✶</span>';
      $('#snowfall').append(node);
      snowNodes.set(day, node);
    }
  }
  function render(freshDay) {
    const focusedDay = document.activeElement?.dataset?.day;
    const fragment = document.createDocumentFragment();
    for (let day = 1; day <= 30; day++) {
      const current = status(day), open = isOpen(day), ready = current === 'available', pending = current === 'pending';
      const sleeping = day === 30 && !birthdayWrapped();
      const label = day === 30 ? 'Cumpleaños' : String(day).padStart(2, '0');
      const button = document.createElement('button');
      button.className = `day tone-${(day - 1) % 5}${day === 29 ? ' special' : ''}${day === 30 ? ' birthday' : ''}${sleeping ? ' birthday-sleeping' : ''}${open ? ' opened' : ready ? ' available' : ''}${pending ? ' challenge-pending' : ''}`;
      button.dataset.day = day;
      const description = pending ? 'Reto pendiente. Continuar' : open ? 'Abierto. Volver a ver' : ready ? 'Disponible. Abrir regalo' : sleeping ? 'Bloqueado hasta completar el día 29' : current === 'date' ? `Se abre el ${formatDate(day)}` : 'Bloqueado. Completa los regalos anteriores';
      button.setAttribute('aria-label', `${day === 30 ? label : `Día ${day}`}. ${description}`);
      // Keep locked buttons focusable so their explanation is available by keyboard.
      const icon = open ? pending ? '✳' : '♡' : ready ? '✧' : lock;
      const heartSvg = '<svg class="tile-heart-bg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
      const thumbContent = pending
        ? '<span class="tile-heart-pending">✳</span>'
        : `<div class="tile-heart-thumb"><img class="tile-heart-img" src="${content(day).image || 'assets/star.svg'}" alt="" loading="lazy"></div>`;
      const sparkles = '<span class="sparkle sp-1">✦</span><span class="sparkle sp-2">✧</span><span class="sparkle sp-3">✦</span>';
      const center = sleeping
        ? `<span class="birthday-padlock">${lock}</span>`
        : open
          ? `<div class="open-icon"><div class="tile-heart-frame">${heartSvg}${thumbContent}${sparkles}</div></div>`
          : `${ribbon}${sparkles}`;
      const caption = pending ? 'Reto pendiente' : open ? 'Un recuerdo más' : day === 30 ? sleeping ? 'Después del día 29' : '17 de enero' : day === 29 ? 'El gran regalo' : ready ? 'Para ti' : 'Por abrir';
      button.innerHTML = `<span class="day-number">${label}</span><span class="day-lock">${icon}</span>${center}<span class="day-label">${caption}</span>`;
      button.addEventListener('click', () => selectDay(day));
      fragment.append(button);
    }
    $('#calendar-grid').replaceChildren(fragment);
    if (focusedDay && !$('#gift-dialog').open) $(`[data-day="${focusedDay}"].day`)?.focus({ preventScroll: true });
    const count = state().opened.length;
    $('#progress-label').textContent = `${count} de 30 regalos abiertos`;
    $('#progress-fill').style.width = `${count / 30 * 100}%`;
    $('#preview-banner').hidden = !preview;
    const pending = state().opened.find(day => !isComplete(day));
    const next = state().completed.length + 1;
    $('#countdown').textContent = pending ? `Hay un reto esperándote en el día ${pending}` : next > 30 ? 'Todos nuestros regalos, todos nuestros recuerdos. ♡' : status(next) === 'date' ? `La próxima sorpresa llega el ${formatDate(next)}` : next === 30 ? 'Tu regalo de cumpleaños te está esperando' : `Tu próxima sorpresa: día ${next}`;
    syncSnow(freshDay);
  }
  function showDialog() {
    const dlg = $('#gift-dialog');
    dlg.classList.remove('dialog-closing');
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  function closeDialog() {
    const dlg = $('#gift-dialog');
    if (!dlg.open) return;
    if (reducedMotion.matches) {
      dlg.close();
      return;
    }
    dlg.classList.add('dialog-closing');
    setTimeout(() => {
      dlg.close();
      dlg.classList.remove('dialog-closing');
    }, 240);
  }
  function selectDay(day) {
    if (!['available', 'pending', 'completed'].includes(status(day))) { showBlocked(day); return; }
    activeDay = day;
    if (isOpen(day)) { reveal(day); showDialog(); return; }
    const previewImg = content(day).image || 'assets/star.svg';
    const heartReveal = `<div class="unwrap-heart-reveal"><div style="position:relative"><svg class="unwrap-heart-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><div class="unwrap-heart-preview"><img src="${previewImg}" alt=""></div></div></div>`;
    $('#dialog-content').innerHTML = `<p class="eyebrow">${day === 30 ? '17 DE ENERO · TU CUMPLEAÑOS' : `TU REGALO DEL ${formatDate(day).toUpperCase()}`}</p><h2 id="dialog-title">Un lazo menos.<br>Una sorpresa más.</h2><button class="day unwrap-gift tone-${(day - 1) % 5}" id="unwrap-button" aria-label="Quitar la cinta y abrir el regalo">${ribbon}${heartReveal}</button><p>Tira del lazo. Este pedacito de nuestra historia es tuyo.</p><button class="dialog-action" id="unwrap-action">Quitar la cinta</button>`;
    const unwrap = () => {
      const gift = $('#unwrap-button');
      if (gift.disabled) return;
      // Recheck at the actual opening, not only when the dialog was shown.
      if (status(day) !== 'available') { showBlocked(day); return; }
      gift.disabled = true;
      $('#unwrap-action').disabled = true;
      gift.classList.add('unwrapping');
      spawnOpenBurst();
      animationTimer = setTimeout(() => {
        if (!rules.open(day, state(), new Date(), preview)) { showBlocked(day); return; }
        persist();
        render(day);
        reveal(day);
      }, reducedMotion.matches ? 0 : 800);
    };
    $('#unwrap-button').addEventListener('click', unwrap);
    $('#unwrap-action').addEventListener('click', unwrap);
    showDialog();
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function appendImage(container, item) {
    if (!item.image) {
      const placeholder = element('div', 'photo-placeholder', 'Un recuerdo por añadir.');
      placeholder.append(element('small', '', 'Este espacio está reservado para una imagen.'));
      container.append(placeholder);
      return;
    }
    const figure = element('figure', 'memory');
    const frame = element('div', 'photo-frame');
    const image = element('img', 'memory-photo');
    image.alt = item.imageAlt || item.title;
    image.decoding = 'async';
    const fitImage = () => {
      const sideways = Math.abs(item.imageRotation || 0) % 180 === 90;
      const fullRatio = sideways ? image.naturalHeight / image.naturalWidth : image.naturalWidth / image.naturalHeight;
      const crop = item.imageCrop ? item.imageCrop : { x: 0, y: 0, width: 1, height: 1 };
      const ratio = fullRatio * crop.width / crop.height;
      frame.style.aspectRatio = String(ratio);
      frame.style.width = `min(100%, ${ratio * 430}px, ${ratio * (item.displayHeight || 52)}dvh)`;
      image.style.width = `${100 * (sideways ? image.naturalWidth / image.naturalHeight : 1) / crop.width}%`;
      image.style.height = `${100 * (sideways ? image.naturalHeight / image.naturalWidth : 1) / crop.height}%`;
      image.style.left = `${100 * (0.5 - crop.x) / crop.width}%`;
      image.style.top = `${100 * (0.5 - crop.y) / crop.height}%`;
      image.style.transform = `translate(-50%, -50%) rotate(${item.imageRotation || 0}deg)`;
      frame.classList.add('photo-loaded');
    };
    image.addEventListener('load', fitImage);
    image.addEventListener('error', () => {
      frame.replaceChildren(element('p', '', 'No se ha podido cargar este recuerdo. Vuelve a abrir el regalo para intentarlo de nuevo.'));
      frame.classList.add('photo-error');
    });
    image.src = item.image;
    frame.append(image);
    figure.append(frame);
    if (item.caption) figure.append(element('figcaption', 'memory-caption', item.caption));
    container.append(figure);
  }
  function reveal(day, justSolved = false) {
    const item = content(day), container = $('#dialog-content');
    const pending = item.type === 'puzzle' && !isComplete(day);
    container.replaceChildren();
    container.append(element('p', 'eyebrow', day === 30 ? '17 DE ENERO · FELIZ CUMPLEAÑOS' : `${formatDate(day)} · PARA TI`));
    container.append(element('div', 'dialog-symbol', item.type === 'plan' ? '✧' : item.type === 'puzzle' ? '✳' : '♡'));
    const heading = element('h2', '', item.title);
    heading.id = 'dialog-title';
    container.append(heading);
    if (!pending) appendImage(container, item);
    if (item.text && (item.type !== 'puzzle' || pending)) container.append(element('p', '', item.text));
    if (pending) {
      if (item.clue) container.append(element('div', 'puzzle-clue', item.clue));
      container.append(element('p', 'challenge-note', 'La foto y el siguiente regalo se desbloquean al resolverlo.'));
      const form = element('form', 'puzzle-form');
      const input = element('input');
      input.placeholder = 'Tu respuesta';
      input.setAttribute('aria-label', 'Respuesta al enigma');
      input.required = true;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.maxLength = 100;
      const submit = element('button', '', 'Comprobar');
      const result = element('p', 'puzzle-result');
      result.setAttribute('role', 'status');
      form.append(input, submit);
      container.append(form, result);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!rules.solve(day, input.value, state())) {
          result.textContent = 'Casi… prueba otra vez. ♡';
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        persist();
        render();
        reveal(day, true);
        notify('¡Lo has descubierto! Tu foto ya está aquí y puedes continuar. ♡');
      });
    } else if (item.type === 'puzzle') {
      container.append(element('p', 'puzzle-success', item.successText || '¡Lo has descubierto! ♡'));
    }
    if (!pending) for (const extraImage of item.extraImages || []) appendImage(container, extraImage);
    const close = element('button', 'dialog-action', pending ? 'Continuar el reto después' : 'Guardar este momento');
    close.addEventListener('click', () => closeDialog());
    container.append(close);
    $('#gift-dialog').scrollTop = 0;
    if (justSolved) { close.focus({ preventScroll: true }); $('#gift-dialog').scrollTop = 0; }
  }
  function note(title, text) {
    activeDay = null;
    const heading = element('h2', '', title);
    heading.id = 'dialog-title';
    $('#dialog-content').replaceChildren(element('div', 'dialog-symbol', '♡'), heading, element('p', '', text));
    showDialog();
  }
  $('.close-dialog').addEventListener('click', () => closeDialog());
  $('#gift-dialog').addEventListener('click', event => {
    if (event.target !== $('#gift-dialog')) return;
    const r = event.target.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog();
  });
  $('#gift-dialog').addEventListener('close', () => {
    clearTimeout(animationTimer);
    clearOpenBurst();
    const day = activeDay;
    activeDay = null;
    if (day) $(`.day[data-day="${day}"]`)?.focus({ preventScroll: true });
  });
  $('#letter-button').addEventListener('click', () => note('Una pequeña carta', config.letter));
  $('#about-button')?.addEventListener('click', () => note('Un diciembre a nuestra manera', 'Cada regalo llega en su fecha y se abre después del anterior. Si aparece un reto, tendrás que resolverlo antes de continuar: su foto te espera al acertar. Cada lazo que quites deja una estrella cayendo despacito por la página. Después del gran regalo del 29, el último paquete se vestirá de cumpleaños… para el 17 de enero. Los recuerdos abiertos siempre se pueden volver a visitar. ♡'));
  $('#preview-button').addEventListener('click', () => {
    preview = true;
    render();
    $('#calendario').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    notify('Demo activada. Empieza por el día 1 y descubre los regalos en orden.');
  });
  $('#exit-preview').addEventListener('click', () => { preview = false; render(); notify('Has vuelto al calendario real.'); });
  $('#reset-preview').addEventListener('click', () => { demoState = window.AdventState.empty(); render(); notify('Demo reiniciada. El primer regalo te espera.'); });
  document.addEventListener('visibilitychange', () => {
    $('#snowfall').classList.toggle('snow-paused', document.hidden);
    if (!document.hidden) render();
  });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    try { realState = rules.restore(JSON.parse(event.newValue || 'null')); } catch { return; }
    if (!preview) {
      if ($('#gift-dialog').open && activeDay) $('#gift-dialog').close();
      render();
    }
  });
  document.addEventListener('pointerdown', () => {
    requestNotificationPermission();
  }, { once: true });

  render();
  checkDailyNotification();
  setInterval(() => {
    if (!document.hidden) {
      render();
      checkDailyNotification();
    }
  }, 60000);
})();
