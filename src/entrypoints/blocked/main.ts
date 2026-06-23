import { browser } from '#imports';
import '../../styles/base.css';
import './style.css';

// The calm blocked page. The blocked domain arrives as ?d=<domain> from the
// declarativeNetRequest redirect. We show it via textContent (never innerHTML)
// so the query value can't inject markup.
const params = new URLSearchParams(location.search);
const domain = params.get('d');

const domainEl = document.querySelector<HTMLElement>('#domain');
if (domainEl && domain) {
  domainEl.textContent = domain;
  document.title = `Blocked: ${domain} — Dopamin Detox`;
}

document.querySelector<HTMLButtonElement>('#back')?.addEventListener('click', () => {
  // Prefer leaving the blocked site behind rather than re-triggering the block.
  if (history.length > 1) {
    history.back();
  } else {
    location.href = 'about:blank';
  }
});

document
  .querySelector<HTMLButtonElement>('#manage')
  ?.addEventListener('click', () => {
    void browser.runtime.openOptionsPage();
  });
