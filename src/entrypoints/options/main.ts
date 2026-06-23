import { browser } from '#imports';
import '../../styles/base.css';
import './style.css';
import { createCrossPromo } from '@/lib/crosspromo';
import { normalizeDomain } from '@/lib/domain';
import { PRIVACY_URL, SUPPORT_EMAIL, WEBSITE_URL } from '@/lib/links';
import {
  addDomain,
  blocklist,
  masterEnabled,
  removeDomain,
} from '@/lib/storage';

// Cross-promo + about section (single source of truth for URLs in links.ts).
document.querySelector('#crosspromo-slot')?.appendChild(createCrossPromo());

const privacyLink = document.querySelector<HTMLAnchorElement>('#link-privacy');
if (privacyLink) privacyLink.href = PRIVACY_URL;
const supportLink = document.querySelector<HTMLAnchorElement>('#link-support');
if (supportLink) supportLink.href = `mailto:${SUPPORT_EMAIL}`;
const websiteLink = document.querySelector<HTMLAnchorElement>('#link-website');
if (websiteLink) websiteLink.href = WEBSITE_URL;

const versionEl = document.querySelector<HTMLElement>('#version');
if (versionEl) {
  versionEl.textContent = `Version ${browser.runtime.getManifest().version}`;
}

const masterBtn = document.querySelector<HTMLButtonElement>('#master');
const masterState = document.querySelector<HTMLElement>('#master-state');
const form = document.querySelector<HTMLFormElement>('#add-form');
const input = document.querySelector<HTMLInputElement>('#add-input');
const errorEl = document.querySelector<HTMLElement>('#add-error');
const listEl = document.querySelector<HTMLUListElement>('#list');
const emptyEl = document.querySelector<HTMLElement>('#empty');

let list: string[] = [];
let enabled = true;

function showError(message: string): void {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError(): void {
  if (!errorEl) return;
  errorEl.textContent = '';
  errorEl.hidden = true;
}

function renderMaster(): void {
  if (!masterBtn || !masterState) return;
  masterBtn.setAttribute('aria-checked', String(enabled));
  masterState.textContent = enabled ? 'On' : 'Off';
}

function renderList(): void {
  if (!listEl || !emptyEl) return;
  listEl.replaceChildren();

  if (list.length === 0) {
    emptyEl.hidden = false;
    listEl.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  listEl.hidden = false;

  for (const domain of list) {
    const li = document.createElement('li');
    li.className = 'block-item';

    const name = document.createElement('span');
    name.className = 'block-item-name';
    name.textContent = domain;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${domain}`);
    remove.addEventListener('click', () => {
      void onRemove(domain);
    });

    li.append(name, remove);
    listEl.appendChild(li);
  }
}

async function onRemove(domain: string): Promise<void> {
  list = await removeDomain(domain);
  renderList();
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();
  const raw = input?.value ?? '';
  const domain = normalizeDomain(raw);
  if (!domain) {
    showError('Enter a valid website, like youtube.com.');
    return;
  }
  if (list.includes(domain)) {
    showError(`${domain} is already on your block list.`);
    return;
  }
  void (async () => {
    list = await addDomain(domain);
    if (input) input.value = '';
    renderList();
  })();
});

input?.addEventListener('input', clearError);

masterBtn?.addEventListener('click', () => {
  enabled = !enabled;
  renderMaster();
  void masterEnabled.setValue(enabled);
});

// Keep settings live if changed from the popup or another synced device.
blocklist.watch((value) => {
  list = value;
  renderList();
});
masterEnabled.watch((value) => {
  enabled = value;
  renderMaster();
});

async function init(): Promise<void> {
  [list, enabled] = await Promise.all([
    blocklist.getValue(),
    masterEnabled.getValue(),
  ]);
  renderMaster();
  renderList();
}

void init();
