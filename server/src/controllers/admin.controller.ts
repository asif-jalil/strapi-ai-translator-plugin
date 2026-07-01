import type { Core } from '@strapi/strapi';

import { GenerateRequestBody, PluginUserConfig, RequestContext, StrapiContext } from 'src/types';
import { buildContentTypesTree, getFieldConfig, saveFieldConfig } from '../utils/field-config';

const controllers = ({ strapi }: StrapiContext) => ({
  // Genertate translations
  async generate(ctx: RequestContext & { request: { body: GenerateRequestBody } }) {
    try {      
      const { fields, components, targetLanguage, contentType } = ctx.request.body;
      const result = await strapi
        .plugin('strapi-ai-translator')
        .service('llm-service')
        .generateWithLLM(contentType, fields, components, {
          targetLanguage,
        });

      ctx.status = result.meta.status;
      ctx.body = result;
    } catch (error) {
      console.error('Error in generate controller:', error);
      ctx.status = 500;
      ctx.body = {
        meta: {
          ok: false,
          status: 500,
          message: 'Internal server error',
        },
      };
    }
  },

  // Get the configuration
  async getConfig(ctx: RequestContext) {
    const pluginStore = strapi.store({
      environment: strapi.config.environment,
      type: 'plugin',
      name: 'strapi-ai-translator', // replace with your plugin name
    });

    const config = await pluginStore.get({ key: 'configuration' });
    ctx.body = (config as PluginUserConfig) || {}; // Return empty object if no config exists yet
  },

  // Save the configuration
  async setConfig(ctx: RequestContext) {
    const { body } = ctx.request;

    // Optional: Add validation for your configuration here
    const pluginStore = strapi.store({
      environment: strapi.config.environment,
      type: 'plugin',
      name: 'strapi-ai-translator', // replace with your plugin name
    });

    await pluginStore.set({
      key: 'configuration',
      value: { ...body },
    });

    ctx.body = (await pluginStore.get({ key: 'configuration' })) as PluginUserConfig;
  },

  // Get all localized content types + their translatable fields, and the saved field config
  async getFieldSettings(ctx: RequestContext) {
    const contentTypes = buildContentTypesTree(strapi as unknown as Core.Strapi);
    const config = await getFieldConfig(strapi as unknown as Core.Strapi);
    ctx.body = { contentTypes, config };
  },

  // Save the per-field translation configuration
  async setFieldSettings(ctx: RequestContext) {
    const { config } = ctx.request.body as {
      config?: Record<string, Record<string, boolean>>;
    };
    const saved = await saveFieldConfig(strapi as unknown as Core.Strapi, config || {});
    ctx.body = { config: saved };
  },
});

export default controllers;
