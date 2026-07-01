import type { Core } from '@strapi/strapi';

// RBAC actions surfaced in Settings > Roles > (role) > Plugins > AI Translator.
const RBAC_ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Update the Translatable Fields settings',
    uid: 'settings.update',
    pluginName: 'strapi-ai-translator',
  },
];

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const actionProvider =
    (strapi as any).admin?.services?.permission?.actionProvider ||
    (strapi as any).service?.('admin::permission')?.actionProvider;

  if (actionProvider?.registerMany) {
    await actionProvider.registerMany(RBAC_ACTIONS);
  } else {
    strapi.log.warn('[strapi-ai-translator] Could not register RBAC actions: admin permission actionProvider unavailable.');
  }
};

export default bootstrap;
