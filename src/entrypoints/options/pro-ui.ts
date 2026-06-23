import { normalizeDomain } from '@/lib/domain';
import { isPro, PRO_FEATURES, proActive } from '@/lib/pro';
import { PRESETS } from '@/lib/presets';
import {
  strictBlocksRelaxing,
  strictCooldownElapsed,
  strictCooldownPending,
} from '@/lib/strict';
import { usedSecondsToday } from '@/lib/usage';
import {
  addDomains,
  blocklist,
  schedules,
  strict,
  usageLimits,
  type Schedule,
  type StrictSettings,
  type UsageLimit,
} from '@/lib/storage';

// Renders the three Pro cards in Options: status/paywall, category presets,
// and strict mode. State lives in storage; this module and Options' main.ts
// both react to it via watchers (storage is the single source of truth).

const statusEl = document.querySelector<HTMLElement>('#pro-status');
const presetsEl = document.querySelector<HTMLElement>('#pro-presets');
const schedulesEl = document.querySelector<HTMLElement>('#pro-schedules');
const usageEl = document.querySelector<HTMLElement>('#pro-usage');
const strictEl = document.querySelector<HTMLElement>('#pro-strict');

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let pro = false;
let strictState: StrictSettings = {
  enabled: false,
  cooldownMinutes: 30,
  pendingUnlockAt: null,
};
let list: string[] = [];
let scheduleList: Schedule[] = [];
let usageList: UsageLimit[] = [];
let tick: ReturnType<typeof setInterval> | undefined;

function proBadge(): HTMLElement {
  const b = document.createElement('span');
  b.className = 'pro-badge';
  b.textContent = 'Pro';
  return b;
}

function heading(text: string, withBadge = false): HTMLElement {
  const h = document.createElement('h2');
  h.textContent = text;
  if (withBadge) {
    h.classList.add('h-badge');
    h.appendChild(proBadge());
  }
  return h;
}

// ---- Status / paywall ----

function renderStatus(): void {
  if (!statusEl) return;
  statusEl.replaceChildren();
  statusEl.appendChild(heading('Dopamin Detox Pro'));

  if (pro) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Pro is active. Thank you for supporting Dopamin Detox.';
    statusEl.appendChild(p);
  } else {
    const intro = document.createElement('p');
    intro.textContent = 'Unlock advanced focus tools:';
    statusEl.appendChild(intro);

    const ul = document.createElement('ul');
    ul.className = 'pro-feature-list';
    for (const label of Object.values(PRO_FEATURES)) {
      const li = document.createElement('li');
      li.textContent = label;
      ul.appendChild(li);
    }
    statusEl.appendChild(ul);

    const price = document.createElement('p');
    price.className = 'pro-price';
    price.textContent = '$1.99 / month or $14.99 / year';
    statusEl.appendChild(price);

    const upgrade = document.createElement('button');
    upgrade.type = 'button';
    upgrade.className = 'btn btn-primary';
    upgrade.textContent = 'Upgrade to Pro';
    const note = document.createElement('p');
    note.className = 'muted pro-upgrade-note';
    note.hidden = true;
    upgrade.addEventListener('click', () => {
      note.hidden = false;
      note.textContent =
        'Online purchasing isn’t available yet — it’s still being set up. ' +
        'For now, use the testing unlock below.';
    });
    statusEl.append(upgrade, note);
  }

  // Temporary testing unlock (removed once a payment processor is wired).
  const devWrap = document.createElement('div');
  devWrap.className = 'pro-dev';
  const devToggle = document.createElement('button');
  devToggle.type = 'button';
  devToggle.className = 'btn';
  devToggle.textContent = pro ? 'Lock Pro (testing)' : 'Unlock Pro (testing)';
  devToggle.addEventListener('click', () => {
    void proActive.setValue(!pro);
  });
  const devNote = document.createElement('p');
  devNote.className = 'muted pro-dev-note';
  devNote.textContent = 'Testing only — temporary until payments are added.';
  devWrap.append(devToggle, devNote);
  statusEl.appendChild(devWrap);
}

// ---- Category presets ----

function presetFullyAdded(domains: string[]): boolean {
  return domains.every((d) => list.includes(d));
}

function renderPresets(): void {
  if (!presetsEl) return;
  presetsEl.replaceChildren();
  presetsEl.appendChild(heading('Category presets', true));

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = pro
    ? 'Block a whole category in one tap. You can remove individual sites afterward.'
    : 'Unlock Pro to block a whole category — social, news, gaming, or adult sites — in one tap.';
  presetsEl.appendChild(desc);

  const wrap = document.createElement('div');
  wrap.className = 'preset-list';
  for (const preset of PRESETS) {
    const row = document.createElement('div');
    row.className = 'preset-row';

    const info = document.createElement('div');
    const name = document.createElement('span');
    name.className = 'preset-name';
    name.textContent = preset.label;
    const count = document.createElement('span');
    count.className = 'muted preset-count';
    count.textContent = `${preset.domains.length} sites`;
    info.append(name, document.createTextNode(' '), count);

    const added = presetFullyAdded(preset.domains);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.disabled = !pro || added;
    btn.textContent = added ? 'Added' : 'Block these';
    btn.addEventListener('click', () => {
      void (async () => {
        list = await addDomains(preset.domains);
        renderPresets();
      })();
    });

    row.append(info, btn);
    wrap.appendChild(row);
  }
  presetsEl.appendChild(wrap);
}

// ---- Strict mode ----

function fmtRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clearTick(): void {
  if (tick) {
    clearInterval(tick);
    tick = undefined;
  }
}

function renderStrict(): void {
  if (!strictEl) return;
  clearTick();
  strictEl.replaceChildren();
  strictEl.appendChild(heading('Strict mode', true));

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent =
    'Make it harder to switch blocking off in a weak moment. You can always make ' +
    'blocking stronger; relaxing it requires a cooldown you start.';
  strictEl.appendChild(desc);

  if (!pro) {
    const locked = document.createElement('p');
    locked.className = 'muted';
    locked.textContent = 'Unlock Pro to use strict mode.';
    strictEl.appendChild(locked);
    return;
  }

  const locked = strictBlocksRelaxing(strictState);

  // On/off switch.
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('span');
  label.className = 'row-label';
  label.id = 'strict-label';
  label.textContent = 'Strict mode';
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'switch';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', String(strictState.enabled));
  sw.setAttribute('aria-labelledby', 'strict-label');
  sw.innerHTML =
    '<span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>' +
    `<span class="switch-state">${strictState.enabled ? 'On' : 'Off'}</span>`;
  sw.addEventListener('click', () => {
    if (strictState.enabled && locked) {
      // Can't turn strict off while locked — must wait out a cooldown.
      flashStrictNote('Start the cooldown below to turn strict mode off.');
      return;
    }
    void strict.setValue({
      ...strictState,
      enabled: !strictState.enabled,
      pendingUnlockAt: null,
    });
  });
  row.append(label, sw);
  strictEl.appendChild(row);

  // Cooldown length.
  const cdRow = document.createElement('div');
  cdRow.className = 'row strict-cooldown-row';
  const cdLabel = document.createElement('label');
  cdLabel.className = 'row-label';
  cdLabel.setAttribute('for', 'strict-cd');
  cdLabel.textContent = 'Cooldown (minutes)';
  const cdInput = document.createElement('input');
  cdInput.type = 'number';
  cdInput.id = 'strict-cd';
  cdInput.min = '1';
  cdInput.max = '720';
  cdInput.value = String(strictState.cooldownMinutes);
  cdInput.className = 'strict-cd-input';
  cdInput.disabled = locked;
  cdInput.addEventListener('change', () => {
    const v = Math.min(720, Math.max(1, Math.round(Number(cdInput.value) || 30)));
    void strict.setValue({ ...strictState, cooldownMinutes: v });
  });
  cdRow.append(cdLabel, cdInput);
  strictEl.appendChild(cdRow);

  // Cooldown flow (only meaningful while strict is on).
  if (strictState.enabled) {
    const flow = document.createElement('div');
    flow.className = 'strict-flow';

    if (strictCooldownPending(strictState) && strictState.pendingUnlockAt) {
      const remaining = document.createElement('p');
      remaining.className = 'strict-remaining';
      const update = () => {
        const ms = (strictState.pendingUnlockAt ?? 0) - Date.now();
        if (ms <= 0) {
          renderStrict();
          return;
        }
        remaining.textContent = `You can make changes in ${fmtRemaining(ms)}.`;
      };
      update();
      tick = setInterval(update, 1000);

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn';
      cancel.textContent = 'Cancel cooldown';
      cancel.addEventListener('click', () => {
        void strict.setValue({ ...strictState, pendingUnlockAt: null });
      });
      flow.append(remaining, cancel);
    } else if (strictCooldownElapsed(strictState)) {
      const ok = document.createElement('p');
      ok.className = 'strict-remaining';
      ok.textContent = 'Cooldown complete — you can turn strict mode off now.';
      flow.appendChild(ok);
    } else {
      const start = document.createElement('button');
      start.type = 'button';
      start.className = 'btn';
      start.textContent = `Start ${strictState.cooldownMinutes}-minute cooldown to make changes`;
      start.addEventListener('click', () => {
        void strict.setValue({
          ...strictState,
          pendingUnlockAt: Date.now() + strictState.cooldownMinutes * 60_000,
        });
      });
      flow.appendChild(start);
    }
    strictEl.appendChild(flow);
  }

  const note = document.createElement('p');
  note.className = 'error';
  note.id = 'strict-note';
  note.setAttribute('role', 'alert');
  note.hidden = true;
  strictEl.appendChild(note);
}

function flashStrictNote(message: string): void {
  const note = document.querySelector<HTMLElement>('#strict-note');
  if (!note) return;
  note.textContent = message;
  note.hidden = false;
}

// ---- Schedules ----

function formatDays(days: number[]): string {
  const set = [...new Set(days)].sort((a, b) => a - b);
  if (set.length === 7) return 'Every day';
  if (set.length === 5 && [1, 2, 3, 4, 5].every((d) => set.includes(d))) {
    return 'Weekdays';
  }
  if (set.length === 2 && set.includes(0) && set.includes(6)) return 'Weekends';
  return set.map((d) => DAY_LABELS[d]).join(', ');
}

function removeButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-danger';
  btn.textContent = 'Remove';
  btn.setAttribute('aria-label', label);
  btn.addEventListener('click', onClick);
  return btn;
}

function renderSchedules(): void {
  if (!schedulesEl) return;
  schedulesEl.replaceChildren();
  schedulesEl.appendChild(heading('Schedules', true));

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = pro
    ? 'Block your list only during these times. With no schedule, your list is blocked whenever blocking is on.'
    : 'Unlock Pro to block your list only at certain times or on certain days.';
  schedulesEl.appendChild(desc);
  if (!pro) return;

  if (scheduleList.length > 0) {
    const ul = document.createElement('ul');
    ul.className = 'sched-list';
    for (const s of scheduleList) {
      const li = document.createElement('li');
      li.className = 'sched-item';
      const text = document.createElement('span');
      text.textContent = `${formatDays(s.days)} · ${s.start}–${s.end}`;
      li.append(
        text,
        removeButton(`Remove schedule ${formatDays(s.days)} ${s.start} to ${s.end}`, () => {
          void schedules.setValue(scheduleList.filter((x) => x.id !== s.id));
        }),
      );
      ul.appendChild(li);
    }
    schedulesEl.appendChild(ul);
  }

  // Add form.
  const form = document.createElement('form');
  form.className = 'sched-form';
  form.noValidate = true;

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'day-picker';
  const legend = document.createElement('legend');
  legend.textContent = 'Days';
  fieldset.appendChild(legend);
  const dayInputs: HTMLInputElement[] = [];
  DAY_LABELS.forEach((label, i) => {
    const wrap = document.createElement('label');
    wrap.className = 'day-option';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = String(i);
    cb.checked = i >= 1 && i <= 5;
    dayInputs.push(cb);
    const span = document.createElement('span');
    span.textContent = label;
    wrap.append(cb, span);
    fieldset.appendChild(wrap);
  });

  const times = document.createElement('div');
  times.className = 'sched-times';
  const startLabel = document.createElement('label');
  startLabel.textContent = 'From';
  const start = document.createElement('input');
  start.type = 'time';
  start.value = '22:00';
  start.required = true;
  startLabel.appendChild(start);
  const endLabel = document.createElement('label');
  endLabel.textContent = 'To';
  const end = document.createElement('input');
  end.type = 'time';
  end.value = '06:00';
  end.required = true;
  endLabel.appendChild(end);
  times.append(startLabel, endLabel);

  const err = document.createElement('p');
  err.className = 'error';
  err.hidden = true;
  err.setAttribute('role', 'alert');

  const add = document.createElement('button');
  add.type = 'submit';
  add.className = 'btn btn-primary';
  add.textContent = 'Add schedule';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;
    const days = dayInputs.filter((cb) => cb.checked).map((cb) => Number(cb.value));
    if (days.length === 0) {
      err.textContent = 'Choose at least one day.';
      err.hidden = false;
      return;
    }
    if (!start.value || !end.value || start.value === end.value) {
      err.textContent = 'Choose a start and end time that differ.';
      err.hidden = false;
      return;
    }
    void schedules.setValue([
      ...scheduleList,
      { id: crypto.randomUUID(), days, start: start.value, end: end.value },
    ]);
  });

  form.append(fieldset, times, add, err);
  schedulesEl.appendChild(form);
}

// ---- Usage limits ----

async function renderUsage(): Promise<void> {
  if (!usageEl) return;
  usageEl.replaceChildren();
  usageEl.appendChild(heading('Usage limits', true));

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = pro
    ? 'Block a site after a set number of minutes of use each day. Resets at midnight.'
    : 'Unlock Pro to block a site after a set amount of time each day.';
  usageEl.appendChild(desc);
  if (!pro) return;

  if (usageList.length > 0) {
    const used = await Promise.all(
      usageList.map((l) => usedSecondsToday(l.domain)),
    );
    const ul = document.createElement('ul');
    ul.className = 'usage-list';
    usageList.forEach((l, i) => {
      const li = document.createElement('li');
      li.className = 'usage-item';
      const info = document.createElement('div');
      const name = document.createElement('span');
      name.className = 'usage-name';
      name.textContent = l.domain;
      const detail = document.createElement('span');
      detail.className = 'muted usage-detail';
      detail.textContent = ` ${Math.floor((used[i] ?? 0) / 60)} / ${l.minutes} min today`;
      info.append(name, detail);
      li.append(
        info,
        removeButton(`Remove usage limit for ${l.domain}`, () => {
          void usageLimits.setValue(usageList.filter((x) => x.domain !== l.domain));
        }),
      );
      ul.appendChild(li);
    });
    usageEl.appendChild(ul);
  }

  const form = document.createElement('form');
  form.className = 'usage-form';
  form.noValidate = true;
  const domainInput = document.createElement('input');
  domainInput.type = 'text';
  domainInput.placeholder = 'e.g. youtube.com';
  domainInput.autocomplete = 'off';
  domainInput.setAttribute('aria-label', 'Website for usage limit');
  const minutesInput = document.createElement('input');
  minutesInput.type = 'number';
  minutesInput.min = '1';
  minutesInput.max = '1440';
  minutesInput.value = '30';
  minutesInput.className = 'usage-minutes';
  minutesInput.setAttribute('aria-label', 'Minutes per day');
  const add = document.createElement('button');
  add.type = 'submit';
  add.className = 'btn btn-primary';
  add.textContent = 'Add limit';
  const err = document.createElement('p');
  err.className = 'error';
  err.hidden = true;
  err.setAttribute('role', 'alert');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;
    const domain = normalizeDomain(domainInput.value);
    const minutes = Math.round(Number(minutesInput.value));
    if (!domain) {
      err.textContent = 'Enter a valid website, like youtube.com.';
      err.hidden = false;
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 1) {
      err.textContent = 'Enter a number of minutes (1 or more).';
      err.hidden = false;
      return;
    }
    if (usageList.some((l) => l.domain === domain)) {
      err.textContent = `${domain} already has a usage limit.`;
      err.hidden = false;
      return;
    }
    void usageLimits.setValue([...usageList, { domain, minutes }]);
  });

  form.append(domainInput, minutesInput, add, err);
  usageEl.appendChild(form);
}

function renderAll(): void {
  renderStatus();
  renderPresets();
  renderSchedules();
  void renderUsage();
  renderStrict();
}

export async function initProUI(): Promise<void> {
  [pro, strictState, list, scheduleList, usageList] = await Promise.all([
    isPro(),
    strict.getValue(),
    blocklist.getValue(),
    schedules.getValue(),
    usageLimits.getValue(),
  ]);
  renderAll();

  proActive.watch((v) => {
    pro = v;
    renderAll();
  });
  strict.watch((v) => {
    strictState = v;
    renderStrict();
  });
  blocklist.watch((v) => {
    list = v;
    renderPresets();
  });
  schedules.watch((v) => {
    scheduleList = v;
    renderSchedules();
  });
  usageLimits.watch((v) => {
    usageList = v;
    void renderUsage();
  });
}
