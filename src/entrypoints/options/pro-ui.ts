import { normalizeDomain } from '@/lib/domain';
import { extpay, isPro, PRO_FEATURES, proActive } from '@/lib/pro';
import { PRESETS } from '@/lib/presets';
import {
  strictBlocksRelaxing,
  strictCooldownElapsed,
  strictCooldownPending,
} from '@/lib/strict';
import {
  siteTimeRecent,
  siteTimeToday,
  usedSecondsToday,
  type SiteTime,
} from '@/lib/usage';
import {
  addDomains,
  addPermanent,
  blocklist,
  permanentList,
  schedules,
  siteTimeHistory,
  strict,
  usageLimits,
  usageState,
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
const siteTimeEl = document.querySelector<HTMLElement>('#pro-sitetime');
const strictEl = document.querySelector<HTMLElement>('#pro-strict');
const permanentEl = document.querySelector<HTMLElement>('#pro-permanent');

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "Time by website" range toggle (module-level so it survives re-renders).
let siteTimeRange: 'today' | 'week' = 'today';

// The full ExtPay user (plan, dates, subscription status). The `User`/`Plan`
// interfaces aren't exported by the package, so derive the type from getUser().
type ExtPayUser = Awaited<ReturnType<typeof extpay.getUser>>;

let pro = false;
let proUser: ExtPayUser | null = null;
// True only after a purchase completes IN THIS SESSION, so we can show an
// explicit "Purchase complete" confirmation (not shown on a normal page load).
let justActivated = false;
let strictState: StrictSettings = {
  enabled: false,
  cooldownMinutes: 30,
  pendingUnlockAt: null,
};
let list: string[] = [];
let scheduleList: Schedule[] = [];
let usageList: UsageLimit[] = [];
let permList: string[] = [];
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

function checkMark(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'pro-active-check');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const circle = document.createElementNS(svg.namespaceURI, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '11');
  circle.setAttribute('fill', 'currentColor');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M7 12.5l3.2 3.2L17 9');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#fff');
  path.setAttribute('stroke-width', '2.4');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(circle, path);
  return svg;
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** "Yearly plan · $14.99 / year" etc. Empty string when the plan is unknown. */
function planLabel(user: ExtPayUser): string {
  const plan = user.plan;
  if (!plan) return '';
  const money = fmtMoney(plan.unitAmountCents, plan.currency);
  if (plan.interval === 'year') return `Yearly plan · ${money} / year`;
  if (plan.interval === 'month') return `Monthly plan · ${money} / month`;
  return `${money} · one-time`;
}

function renderStatus(): void {
  if (!statusEl) return;
  statusEl.replaceChildren();
  statusEl.appendChild(heading('Dopamin Detox Pro'));

  if (pro) {
    const panel = document.createElement('div');
    panel.className = 'pro-active';

    const head = document.createElement('div');
    head.className = 'pro-active-head';
    const title = document.createElement('span');
    title.className = 'pro-active-title';
    title.textContent = justActivated ? 'Purchase complete — Pro is active' : 'Pro is active';
    head.append(checkMark(), title);
    panel.appendChild(head);

    // Plan + price.
    const label = proUser ? planLabel(proUser) : '';
    if (label) {
      const planEl = document.createElement('p');
      planEl.className = 'pro-active-plan';
      planEl.textContent = label;
      panel.appendChild(planEl);
    }

    // Status / renewal line (honest about what ExtPay actually reports).
    const status = proUser?.subscriptionStatus;
    const cancelAt = proUser?.subscriptionCancelAt;
    const detail = document.createElement('p');
    if (status === 'past_due') {
      detail.className = 'pro-warn';
      detail.textContent =
        'There was a problem with your last payment. Update your payment method to keep Pro.';
    } else if (cancelAt) {
      detail.className = 'pro-warn';
      detail.textContent = `Your plan is set to end on ${fmtDate(cancelAt)}.`;
    } else if (proUser?.plan && proUser.plan.interval !== 'once') {
      detail.className = 'muted';
      detail.textContent = 'Renews automatically. You can cancel anytime.';
    } else if (proUser?.paidAt) {
      detail.className = 'muted';
      detail.textContent = `Active since ${fmtDate(proUser.paidAt)}.`;
    } else {
      detail.className = 'muted';
      detail.textContent = 'Thank you for supporting Dopamin Detox.';
    }
    panel.appendChild(detail);

    if (proUser?.paidAt && !cancelAt && status !== 'past_due') {
      const since = document.createElement('p');
      since.className = 'muted pro-active-since';
      since.textContent = `Member since ${fmtDate(proUser.paidAt)}.`;
      panel.appendChild(since);
    }

    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'btn';
    manage.textContent =
      status === 'past_due' ? 'Update payment method' : 'Manage subscription';
    manage.addEventListener('click', () => {
      void extpay.openPaymentPage();
    });
    panel.appendChild(manage);

    statusEl.appendChild(panel);
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

    // Shown after the user opens checkout, so they know what to expect when
    // they come back to this tab.
    const pending = document.createElement('p');
    pending.className = 'pro-pending';
    pending.setAttribute('role', 'status');
    pending.hidden = true;
    pending.textContent =
      'Complete your purchase in the tab that just opened. When you come back here, Pro unlocks automatically.';

    const upgrade = document.createElement('button');
    upgrade.type = 'button';
    upgrade.className = 'btn btn-primary';
    upgrade.textContent = 'Upgrade to Pro';
    upgrade.addEventListener('click', () => {
      pending.hidden = false;
      void extpay.openPaymentPage();
    });

    // Already paid (e.g. on another device)? Sign in to restore.
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'btn';
    restore.textContent = 'Restore purchase';
    restore.addEventListener('click', () => {
      pending.hidden = false;
      void extpay.openLoginPage();
    });

    const note = document.createElement('p');
    note.className = 'muted pro-upgrade-note';
    note.textContent =
      'Secure checkout on ExtensionPay. Cancel anytime — the yearly plan is the ' +
      'best value.';
    statusEl.append(upgrade, restore, pending, note);
  }

  // Dev-only unlock: present in `wxt dev`, compiled OUT of production builds so
  // it can never ship as a free-unlock backdoor in the store.
  if (import.meta.env.DEV) {
    const devWrap = document.createElement('div');
    devWrap.className = 'pro-dev';
    const devToggle = document.createElement('button');
    devToggle.type = 'button';
    devToggle.className = 'btn';
    devToggle.textContent = pro ? 'Lock Pro (dev)' : 'Unlock Pro (dev)';
    devToggle.addEventListener('click', () => {
      void proActive.setValue(!pro);
    });
    const devNote = document.createElement('p');
    devNote.className = 'muted pro-dev-note';
    devNote.textContent = 'Dev build only — not present in store builds.';
    devWrap.append(devToggle, devNote);
    statusEl.appendChild(devWrap);
  }
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

// ---- Time by website (Pro report) ----

function fmtDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return '<1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function rangeButton(
  label: string,
  active: boolean,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'seg-btn';
  btn.textContent = label;
  btn.setAttribute('aria-pressed', String(active));
  btn.addEventListener('click', onClick);
  return btn;
}

async function renderSiteTime(): Promise<void> {
  if (!siteTimeEl) return;
  siteTimeEl.replaceChildren();
  siteTimeEl.appendChild(heading('Time by website', true));

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = pro
    ? 'See where your time goes. Counted on this device only, while a tab is in ' +
      'focus — nothing ever leaves your browser.'
    : 'Unlock Pro to see how much time you spend on each website.';
  siteTimeEl.appendChild(desc);
  if (!pro) return;

  // Today / Last 7 days toggle.
  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Time range');
  seg.append(
    rangeButton('Today', siteTimeRange === 'today', () => {
      if (siteTimeRange !== 'today') {
        siteTimeRange = 'today';
        void renderSiteTime();
      }
    }),
    rangeButton('Last 7 days', siteTimeRange === 'week', () => {
      if (siteTimeRange !== 'week') {
        siteTimeRange = 'week';
        void renderSiteTime();
      }
    }),
  );
  siteTimeEl.appendChild(seg);

  const data: SiteTime[] =
    siteTimeRange === 'today' ? await siteTimeToday() : await siteTimeRecent();
  // Drop noise under ~30s; show the top sites only.
  const top = data.filter((d) => d.seconds >= 30).slice(0, 15);

  if (top.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent =
      siteTimeRange === 'today'
        ? 'No browsing time recorded yet today.'
        : 'No browsing time recorded in the last 7 days.';
    siteTimeEl.appendChild(empty);
    return;
  }

  const max = top[0]?.seconds ?? 1;
  const ul = document.createElement('ul');
  ul.className = 'sitetime-list';
  for (const { domain, seconds } of top) {
    const li = document.createElement('li');
    li.className = 'sitetime-item';

    const head = document.createElement('div');
    head.className = 'sitetime-head';
    const name = document.createElement('span');
    name.className = 'sitetime-name';
    name.textContent = domain;
    const time = document.createElement('span');
    time.className = 'sitetime-time';
    time.textContent = fmtDuration(seconds);
    head.append(name, time);

    const track = document.createElement('div');
    track.className = 'sitetime-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'sitetime-fill';
    fill.style.width = `${Math.max(2, Math.round((seconds / max) * 100))}%`;
    track.appendChild(fill);

    li.append(head, track);
    ul.appendChild(li);
  }
  siteTimeEl.appendChild(ul);
}

// ---- Permanent block (hard mode) ----

function permConfirm(label: string, domains: string[]): boolean {
  return window.confirm(
    `Permanently block ${label} (${domains.length} site${domains.length === 1 ? '' : 's'})?\n\n` +
      'This is hard mode: you will NOT be able to unblock these from the ' +
      'extension — no off switch, no cooldown. The only way to undo it is to ' +
      'uninstall the extension entirely.\n\nContinue?',
  );
}

function renderPermanent(): void {
  if (!permanentEl) return;
  permanentEl.replaceChildren();
  permanentEl.appendChild(heading('Permanent block (hard mode)', true));

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = pro
    ? 'Block sites for good. Once added here they can’t be unblocked, turned off, ' +
      'or removed in the extension — the only way to undo it is to uninstall the ' +
      'extension. Best for things like adult sites you never want to reach.'
    : 'Unlock Pro to block a category for good — no off switch, no cooldown.';
  permanentEl.appendChild(desc);
  if (!pro) return;

  // Current permanently-blocked sites (read-only — no remove).
  if (permList.length > 0) {
    const ul = document.createElement('ul');
    ul.className = 'perm-list';
    for (const domain of permList) {
      const li = document.createElement('li');
      li.className = 'perm-item';
      const name = document.createElement('span');
      name.className = 'perm-name';
      name.textContent = domain;
      const lock = document.createElement('span');
      lock.className = 'perm-locked';
      lock.textContent = 'Locked';
      li.append(name, lock);
      ul.appendChild(li);
    }
    permanentEl.appendChild(ul);
  }

  // Block a whole category for good.
  const cats = document.createElement('div');
  cats.className = 'perm-cats';
  for (const preset of PRESETS) {
    const allLocked = preset.domains.every((d) => permList.includes(d));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger';
    btn.disabled = allLocked;
    btn.textContent = allLocked
      ? `${preset.label} — locked`
      : `Block ${preset.label} forever`;
    btn.addEventListener('click', () => {
      if (!permConfirm(preset.label, preset.domains)) return;
      void (async () => {
        permList = await addPermanent(preset.domains);
        renderPermanent();
      })();
    });
    cats.appendChild(btn);
  }
  permanentEl.appendChild(cats);

  // Block a single custom site for good.
  const form = document.createElement('form');
  form.className = 'perm-form';
  form.noValidate = true;
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'e.g. pornhub.com';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Website to block permanently');
  const add = document.createElement('button');
  add.type = 'submit';
  add.className = 'btn btn-danger';
  add.textContent = 'Block forever';
  const err = document.createElement('p');
  err.className = 'error';
  err.hidden = true;
  err.setAttribute('role', 'alert');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;
    const domain = normalizeDomain(input.value);
    if (!domain) {
      err.textContent = 'Enter a valid website, like pornhub.com.';
      err.hidden = false;
      return;
    }
    if (permList.includes(domain)) {
      err.textContent = `${domain} is already permanently blocked.`;
      err.hidden = false;
      return;
    }
    if (!permConfirm(domain, [domain])) return;
    void (async () => {
      permList = await addPermanent([domain]);
      input.value = '';
      renderPermanent();
    })();
  });
  form.append(input, add, err);
  permanentEl.appendChild(form);
}

function renderAll(): void {
  renderStatus();
  renderPresets();
  renderSchedules();
  void renderUsage();
  void renderSiteTime();
  renderStrict();
  renderPermanent();
}

/** Pull the full ExtPay user (plan + dates) for the active panel. */
async function loadProUser(): Promise<void> {
  if (!pro) {
    proUser = null;
    return;
  }
  try {
    proUser = await extpay.getUser();
  } catch {
    proUser = null; // offline: panel falls back to the plain "Pro is active"
  }
}

/**
 * Ask ExtPay directly for paid status and refresh the UI. Called when the tab
 * becomes visible again (e.g. the user just finished checkout in another tab),
 * so Pro is reflected immediately without waiting for the background poll.
 */
async function refreshFromExtPay(): Promise<void> {
  let user: ExtPayUser;
  try {
    user = await extpay.getUser();
  } catch {
    return; // offline: keep whatever we have
  }
  const nowPaid = user.paid === true;
  if (nowPaid && !pro) justActivated = true;
  proUser = user;
  if (nowPaid !== pro) {
    pro = nowPaid;
    await proActive.setValue(nowPaid); // keeps the cache + background in sync
  }
  renderStatus();
}

export async function initProUI(): Promise<void> {
  [pro, strictState, list, scheduleList, usageList, permList] =
    await Promise.all([
      isPro(),
      strict.getValue(),
      blocklist.getValue(),
      schedules.getValue(),
      usageLimits.getValue(),
      permanentList.getValue(),
    ]);
  await loadProUser();
  renderAll();

  // Instant unlock the moment payment completes while this page is open.
  extpay.onPaid.addListener((user) => {
    justActivated = true;
    pro = true;
    proUser = user;
    void proActive.setValue(true);
    renderStatus();
  });

  // Re-check when the user returns to this tab after paying.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshFromExtPay();
  });

  proActive.watch((v) => {
    if (v && !pro) justActivated = true;
    pro = v;
    void (async () => {
      await loadProUser();
      renderAll();
    })();
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
  // Live-update the time report as the background records time / archives days.
  usageState.watch(() => void renderSiteTime());
  siteTimeHistory.watch(() => void renderSiteTime());
  permanentList.watch((v) => {
    permList = v;
    renderPermanent();
  });
}
