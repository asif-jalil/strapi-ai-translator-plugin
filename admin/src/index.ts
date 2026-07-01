// import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import LLMButton from './components/LLMButton';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: PLUGIN_ID,
      },
      Component: async () => {
        const { App } = await import('./pages/App');

        return App;
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: { id: `${PLUGIN_ID}.settings.section`, defaultMessage: 'AI Translator' },
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.fields.link`,
            defaultMessage: 'Translatable Fields',
          },
          id: 'field-settings',
          to: `${PLUGIN_ID}/field-settings`,
          Component: async () => {
            const { FieldSettings } = await import('./pages/FieldSettings');
            return FieldSettings;
          },
          permissions: [],
        },
      ]
    );
  },

  bootstrap(app: any) {
    // Adds the Button to the Entry Area on the right
    app.getPlugin('content-manager').injectComponent('editView', 'right-links', {
      name: 'llm-assistant-button',
      Component: LLMButton,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
