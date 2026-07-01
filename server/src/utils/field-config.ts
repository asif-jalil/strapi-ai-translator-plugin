import type { Core } from '@strapi/strapi';

/**
 * Shared helpers for the per-field translation configuration feature.
 *
 * A "field key" uniquely identifies a translatable field position within a
 * content type, independent of array indices. Segments are joined with `::`.
 * For dynamic zones the component uid is inserted as a segment so that fields
 * of different components in the same zone stay distinct, e.g.
 *   title
 *   seo::metaTitle                 (component field)
 *   MyAds::ads.our-ads::headline   (dynamic-zone field)
 */
export const FIELD_KEY_SEP = '::';

// Field types the plugin can translate. `uid` is not translated directly but is
// user-configurable (it controls whether the slug is regenerated).
export const TRANSLATABLE_SCALAR_TYPES = ['string', 'text', 'richtext', 'richText', 'blocks', 'json'];

// System / non-content attributes that must never be offered for translation.
const SYSTEM_FIELDS = new Set([
  'locale',
  'localizations',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'documentId',
  'strapi_stage',
  'strapi_assignee',
]);

const STORE_KEY = 'field-configuration';

const isTranslatableType = (type: string): boolean =>
  TRANSLATABLE_SCALAR_TYPES.includes(type) || type === 'uid';

const isSystemAttribute = (name: string, attr: Record<string, any>): boolean =>
  SYSTEM_FIELDS.has(name) || attr?.configurable === false || attr?.private === true;

export interface FieldLeafNode {
  kind: 'field';
  name: string;
  type: string;
  key: string;
  translatable: boolean;
}
export interface ComponentNode {
  kind: 'component';
  name: string;
  component: string;
  repeatable: boolean;
  key: string;
  children: FieldNode[];
}
export interface DynamicZoneComponentGroup {
  component: string;
  key: string;
  children: FieldNode[];
}
export interface DynamicZoneNode {
  kind: 'dynamiczone';
  name: string;
  key: string;
  components: DynamicZoneComponentGroup[];
}
export type FieldNode = FieldLeafNode | ComponentNode | DynamicZoneNode;

export interface ContentTypeFieldTree {
  uid: string;
  kind: string;
  displayName: string;
  fields: FieldNode[];
}

// contentType uid -> field key -> enabled. A missing key means "enabled".
export type FieldConfigMap = Record<string, Record<string, boolean>>;

const getStore = (strapi: Core.Strapi) =>
  strapi.store({
    environment: strapi.config.environment,
    type: 'plugin',
    name: 'strapi-ai-translator',
  });

/**
 * Recursively build the field tree for a set of attributes. Components and
 * dynamic zones are always included so their structure is visible; each leaf
 * carries a `translatable` flag (non-translatable fields are shown for context
 * but cannot be toggled).
 */
export const buildFieldTree = (
  attributes: Record<string, any> = {},
  components: Record<string, any> = {},
  parentSegments: string[] = []
): FieldNode[] => {
  const nodes: FieldNode[] = [];

  for (const [name, attrRaw] of Object.entries(attributes)) {
    const attr = attrRaw as Record<string, any>;
    if (isSystemAttribute(name, attr)) continue;

    const segments = [...parentSegments, name];
    const key = segments.join(FIELD_KEY_SEP);

    if (attr.type === 'component') {
      const comp = components[attr.component];
      if (!comp) continue;
      nodes.push({
        kind: 'component',
        name,
        component: attr.component,
        repeatable: !!attr.repeatable,
        key,
        children: buildFieldTree(comp.attributes, components, segments),
      });
    } else if (attr.type === 'dynamiczone') {
      const groups = ((attr.components as string[]) || [])
        .map((componentUid): DynamicZoneComponentGroup | null => {
          const comp = components[componentUid];
          if (!comp) return null;
          const childSegments = [...segments, componentUid];
          return {
            component: componentUid,
            key: childSegments.join(FIELD_KEY_SEP),
            children: buildFieldTree(comp.attributes, components, childSegments),
          };
        })
        .filter((g): g is DynamicZoneComponentGroup => g !== null);
      nodes.push({ kind: 'dynamiczone', name, key, components: groups });
    } else {
      nodes.push({ kind: 'field', name, type: attr.type, key, translatable: isTranslatableType(attr.type) });
    }
  }

  return nodes;
};

/** All *translatable* leaf keys under a set of nodes (used for toggles / gating). */
export const collectLeafKeys = (nodes: FieldNode[]): string[] => {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.kind === 'field') {
      if (node.translatable) keys.push(node.key);
    } else if (node.kind === 'component') {
      keys.push(...collectLeafKeys(node.children));
    } else if (node.kind === 'dynamiczone') {
      node.components.forEach((g) => keys.push(...collectLeafKeys(g.children)));
    }
  }
  return keys;
};

/** Build the field tree for every localized, user-created content type that has translatable fields. */
export const buildContentTypesTree = (strapi: Core.Strapi): ContentTypeFieldTree[] => {
  const components = (strapi as any).components as Record<string, any>;

  const result: ContentTypeFieldTree[] = [];

  for (const [uid, ctRaw] of Object.entries(strapi.contentTypes)) {
    if (!uid.startsWith('api::')) continue; // user-created content types only
    const ct = ctRaw as Record<string, any>;
    
    if (!ct.pluginOptions?.i18n?.localized) continue; // only i18n-enabled types can be translated

    const fields = buildFieldTree(ct.attributes, components, []);
    if (!collectLeafKeys(fields).length) continue; // nothing translatable to configure

    result.push({
      uid,
      kind: ct.kind,
      displayName: ct.info?.displayName || ct.globalId || uid,
      fields,
    });
  }

  return result;
};

export const getFieldConfig = async (strapi: Core.Strapi): Promise<FieldConfigMap> => {
  const config = (await getStore(strapi).get({ key: STORE_KEY })) as FieldConfigMap | null;
  return config || {};
};

export const saveFieldConfig = async (
  strapi: Core.Strapi,
  config: FieldConfigMap
): Promise<FieldConfigMap> => {
  await getStore(strapi).set({ key: STORE_KEY, value: config });
  return (await getStore(strapi).get({ key: STORE_KEY })) as FieldConfigMap;
};

/** Set of field keys explicitly disabled (enabled === false) for a content type. */
export const getDisabledKeys = (config: FieldConfigMap, contentTypeUID: string): Set<string> => {
  const ctConfig = config[contentTypeUID] || {};
  return new Set(
    Object.entries(ctConfig)
      .filter(([, enabled]) => enabled === false)
      .map(([key]) => key)
  );
};
