// Central place for outbound URLs and identity, so copy stays consistent and
// the App Store link is set in exactly one spot when the iOS app ships.

export const WEBSITE_URL = 'https://dopamindetox.app';
export const PRIVACY_URL = 'https://dopamindetox.app/privacy';
export const SUPPORT_EMAIL = 'dopaminedetox570@gmail.com';

// iOS App Store link — NOT live yet. Set this to the real URL when the app
// ships; until then the cross-promo card shows "coming soon" rather than a
// broken link. (Placeholder per the build brief's [APP_STORE_URL].)
export const APP_STORE_URL: string | null = null;
