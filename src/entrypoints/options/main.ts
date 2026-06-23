import '../../styles/base.css';
import './style.css';
import { normalizeDomain } from '@/lib/domain';
import {
  addDomain,
  blocklist,
  masterEnabled,
  removeDomain,
} from '@/lib/storage';

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
