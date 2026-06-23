import { browser } from '#imports';
import '../../styles/base.css';
import './style.css';
import { createCrossPromo } from '@/lib/crosspromo';
import { normalizeDomain } from '@/lib/domain';
import { strictBlocksRelaxing } from '@/lib/strict';
import {
  addDomain,
  blocklist,
  masterEnabled,
  removeDomain,
  strict,
  type StrictSettings,
} from '@/lib/storage';

document.querySelector('#crosspromo-slot')?.appendChild(createCrossPromo());

const masterBtn = document.querySelector<HTMLButtonElement>('#master');
const masterState = document.querySelector<HTMLElement>('#master-state');
const noteEl = document.querySelector<HTMLElement>('#popup-note');
const siteDomainEl = document.querySelector<HTMLElement>('#site-domain');
const siteActionEl = document.querySelector<HTMLElement>('#site-action');
const countEl = document.querySelector<HTMLElement>('#count');
const manageBtn = document.querySelector<HTMLButtonElement>('#manage');

let list: string[] = [];
let enabled = true;
let currentDomain: string | null = null;
let strictState: StrictSettings = {
  enabled: false,
  cooldownMinutes: 30,
  pendingUnlockAt: null,
};

function strictLocked(): boolean {
  return strictBlocksRelaxing(strictState);
}

function showNote(message: string): void {
  if (!noteEl) return;
  noteEl.textContent = message;
  noteEl.hidden = false;
}

function clearNote(): void {
  if (!noteEl) return;
  noteEl.textContent = '';
  noteEl.hidden = true;
}

const STRICT_MSG = 'Strict mode is on. Open settings to start a cooldown first.';

async function getCurrentDomain(): Promise<string | null> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url;
    return url ? normalizeDomain(url) : null;
  } catch {
    return null;
  }
}

function renderMaster(): void {
  if (!masterBtn || !masterState) return;
  masterBtn.setAttribute('aria-checked', String(enabled));
  masterState.textContent = enabled ? 'On' : 'Off';
}

function renderCount(): void {
  if (!countEl) return;
  const n = list.length;
  countEl.textContent =
    n === 0 ? 'No sites blocked yet' : `${n} site${n === 1 ? '' : 's'} blocked`;
}

function renderSite(): void {
  if (!siteDomainEl || !siteActionEl) return;
  siteActionEl.replaceChildren();

  if (!currentDomain) {
    siteDomainEl.className = 'site-domain muted';
    siteDomainEl.textContent = 'Open a website to add it to your block list.';
    return;
  }

  siteDomainEl.className = 'site-domain';
  siteDomainEl.textContent = currentDomain;

  const isBlocked = list.includes(currentDomain);

  if (isBlocked) {
    const status = document.createElement('p');
    status.className = 'site-status';
    status.textContent = 'On your block list';
    siteActionEl.appendChild(status);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = isBlocked ? 'btn btn-danger' : 'btn btn-primary';
  btn.textContent = isBlocked ? 'Unblock this site' : 'Block this site';
  // Unblocking is a "relaxing" action — gated by strict mode. Blocking is not.
  btn.disabled = isBlocked && strictLocked();
  if (btn.disabled) btn.title = STRICT_MSG;
  btn.addEventListener('click', () => {
    void toggleCurrent(isBlocked);
  });
  siteActionEl.appendChild(btn);
}

async function toggleCurrent(isBlocked: boolean): Promise<void> {
  if (!currentDomain) return;
  if (isBlocked && strictLocked()) {
    showNote(STRICT_MSG);
    return;
  }
  clearNote();
  list = isBlocked
    ? await removeDomain(currentDomain)
    : await addDomain(currentDomain);
  renderSite();
  renderCount();
}

async function init(): Promise<void> {
  [list, enabled, currentDomain, strictState] = await Promise.all([
    blocklist.getValue(),
    masterEnabled.getValue(),
    getCurrentDomain(),
    strict.getValue(),
  ]);
  renderMaster();
  renderSite();
  renderCount();
}

masterBtn?.addEventListener('click', () => {
  const next = !enabled;
  if (!next && strictLocked()) {
    showNote(STRICT_MSG);
    return;
  }
  clearNote();
  enabled = next;
  renderMaster();
  void masterEnabled.setValue(enabled);
});

manageBtn?.addEventListener('click', () => {
  void browser.runtime.openOptionsPage();
});

void init();
