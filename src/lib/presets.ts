// Category preset bundles (Pro). One tap adds a curated set of domains to the
// block list. Lists are intentionally short and well-known; the user can always
// add/remove individual sites afterward.

export interface Preset {
  id: string;
  label: string;
  domains: string[];
}

export const PRESETS: Preset[] = [
  {
    id: 'social',
    label: 'Social media',
    domains: [
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'x.com',
      'tiktok.com',
      'snapchat.com',
      'reddit.com',
    ],
  },
  {
    id: 'news',
    label: 'News',
    domains: [
      'cnn.com',
      'bbc.com',
      'nytimes.com',
      'foxnews.com',
      'news.google.com',
    ],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    domains: [
      'twitch.tv',
      'store.steampowered.com',
      'epicgames.com',
      'ign.com',
      'roblox.com',
    ],
  },
  {
    id: 'adult',
    label: 'Adult sites',
    domains: [
      'pornhub.com',
      'xvideos.com',
      'xnxx.com',
      'xhamster.com',
      'onlyfans.com',
    ],
  },
];
