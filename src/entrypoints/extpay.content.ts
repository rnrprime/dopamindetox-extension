import ExtPay from 'extpay';

// ExtPay's relay content script. It must run on extensionpay.com so the hosted
// Stripe checkout can report a completed payment back to the extension (this is
// what makes `extpay.onPaid` fire). Importing the module executes that relay;
// the `void ExtPay` reference keeps bundlers from tree-shaking the import away.
// It runs ONLY on extensionpay.com — never on the user's normal browsing.
export default defineContentScript({
  matches: ['https://extensionpay.com/*'],
  runAt: 'document_start',
  main() {
    void ExtPay;
  },
});
