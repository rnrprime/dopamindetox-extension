import { APP_STORE_URL } from './links';

// Tasteful "Also on iPhone" cross-promo (v1 = links + shared branding only;
// no login, no account, no data sync). Small and non-nagging — it must never
// get in the way of the free experience.
export function createCrossPromo(): HTMLElement {
  const card = document.createElement('section');
  card.className = 'crosspromo';
  card.setAttribute('aria-label', 'Dopamin Detox on other devices');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'crosspromo-eyebrow';
  eyebrow.textContent = 'Also on iPhone';

  const text = document.createElement('p');
  text.className = 'crosspromo-text';
  text.textContent =
    'Block apps and sites everywhere with Dopamin Detox for iPhone.';

  card.append(eyebrow, text);

  if (APP_STORE_URL) {
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = APP_STORE_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Get it on the App Store';
    card.appendChild(link);
  } else {
    const soon = document.createElement('p');
    soon.className = 'muted crosspromo-soon';
    soon.textContent = 'Coming soon to the App Store.';
    card.appendChild(soon);
  }

  const android = document.createElement('p');
  android.className = 'muted crosspromo-android';
  android.textContent = 'Android coming soon.';
  card.appendChild(android);

  return card;
}
