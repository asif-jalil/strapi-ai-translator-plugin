export default [
  {
    method: 'POST',
    path: '/generate',
    handler: 'admin.generate',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/config',
    handler: 'admin.getConfig',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/config',
    handler: 'admin.setConfig',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/field-settings',
    handler: 'admin.getFieldSettings',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/field-settings',
    handler: 'admin.setFieldSettings',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: { actions: ['plugin::strapi-ai-translator.settings.update'] },
        },
      ],
    },
  },
];
