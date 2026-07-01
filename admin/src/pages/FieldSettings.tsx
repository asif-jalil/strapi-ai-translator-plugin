import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  Accordion,
  Badge,
  Box,
  Button,
  EmptyStateLayout,
  Flex,
  Loader,
  Main,
  Typography,
} from '@strapi/design-system';
import { CheckCircle, CheckCircleEmpty, Lock } from '@strapi/icons';

import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../../src/pluginId';

interface FieldLeafNode {
  kind: 'field';
  name: string;
  type: string;
  key: string;
  translatable: boolean;
}
interface ComponentNode {
  kind: 'component';
  name: string;
  component: string;
  repeatable: boolean;
  key: string;
  children: FieldNode[];
}
interface DynamicZoneComponentGroup {
  component: string;
  key: string;
  children: FieldNode[];
}
interface DynamicZoneNode {
  kind: 'dynamiczone';
  name: string;
  key: string;
  components: DynamicZoneComponentGroup[];
}
type FieldNode = FieldLeafNode | ComponentNode | DynamicZoneNode;

interface ContentTypeTree {
  uid: string;
  kind: string;
  displayName: string;
  fields: FieldNode[];
}

type FieldConfigMap = Record<string, Record<string, boolean>>;

const TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  text: 'Long text',
  email: 'Email',
  richtext: 'Rich text',
  richText: 'Rich text',
  blocks: 'Rich text',
  json: 'JSON',
  uid: 'UID',
  media: 'Media',
  integer: 'Number',
  biginteger: 'Number',
  decimal: 'Number',
  float: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  datetime: 'Date',
  timestamp: 'Date',
  time: 'Time',
  enumeration: 'Enum',
  relation: 'Relation',
  password: 'Password',
};
const typeLabel = (type: string): string => TYPE_LABELS[type] || type;

/* ---- tiles ---------------------------------------------------------------- */
const Tile = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.colors.success500 : theme.colors.neutral200)};
  background: ${({ theme, $on }) => ($on ? theme.colors.success100 : theme.colors.neutral0)};
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;

  &:hover {
    border-color: ${({ theme, $on }) => ($on ? theme.colors.success600 : theme.colors.neutral400)};
  }
`;

const StaticTile = styled(Flex)`
  min-width: 160px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral0};
`;

const collectLeafKeys = (nodes: FieldNode[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind === 'field') return node.translatable ? [node.key] : [];
    if (node.kind === 'component') return collectLeafKeys(node.children);
    return node.components.flatMap((group) => collectLeafKeys(group.children));
  });

const FieldSettings = () => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentTypes, setContentTypes] = useState<ContentTypeTree[]>([]);
  const [config, setConfig] = useState<FieldConfigMap>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await get(`/${PLUGIN_ID}/field-settings`);
        setContentTypes(data.contentTypes || []);
        setConfig(data.config || {});
      } catch (error) {
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: getTranslation('settings.fields.load_error'),
            defaultMessage: 'Failed to load field settings',
          }),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isEnabled = (uid: string, key: string): boolean => config[uid]?.[key] !== false;
  const countEnabled = (uid: string, keys: string[]): number =>
    keys.filter((key) => isEnabled(uid, key)).length;

  const setKeys = (uid: string, keys: string[], value: boolean) => {
    if (keys.length === 0) return;
    setConfig((prev) => {
      const next = { ...(prev[uid] || {}) };
      keys.forEach((key) => {
        next[key] = value;
      });
      return { ...prev, [uid]: next };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await post(`/${PLUGIN_ID}/field-settings`, { config });
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('settings.fields.save_success'),
          defaultMessage: 'Field settings saved',
        }),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslation('settings.fields.save_error'),
          defaultMessage: 'Failed to save field settings',
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const countColor = (enabled: number, total: number): string => {
    if (total === 0 || enabled === 0) return 'neutral400';
    if (enabled === total) return 'success600';
    return 'neutral600';
  };

  const FieldTile = ({ uid, node }: { uid: string; node: FieldLeafNode }) => {
    if (!node.translatable) {
      return (
        <StaticTile alignItems="center" gap={2}>
          <Lock width={16} height={16} fill="neutral400" />
          <Flex direction="column" alignItems="flex-start">
            <Typography variant="omega" textColor="neutral500">
              {node.name}
            </Typography>
            <Typography variant="pi" textColor="neutral400">
              {typeLabel(node.type)} ·{' '}
              {formatMessage({
                id: getTranslation('settings.fields.read_only'),
                defaultMessage: 'read-only',
              })}
            </Typography>
          </Flex>
        </StaticTile>
      );
    }

    const on = isEnabled(uid, node.key);
    return (
      <Tile
        type="button"
        $on={on}
        onClick={() => setKeys(uid, [node.key], !on)}
        aria-pressed={on}
        aria-label={`${node.name} — ${on ? 'translated' : 'excluded'}`}
      >
        {on ? (
          <CheckCircle width={18} height={18} fill="success600" />
        ) : (
          <CheckCircleEmpty width={18} height={18} fill="neutral400" />
        )}
        <Flex direction="column" alignItems="flex-start">
          <Typography
            variant="omega"
            fontWeight={on ? 'bold' : 'regular'}
            textColor={on ? 'success700' : 'neutral700'}
          >
            {node.name}
          </Typography>
          <Typography variant="pi" textColor="neutral500">
            {typeLabel(node.type)}
          </Typography>
        </Flex>
      </Tile>
    );
  };

  // Tiles for scalar fields at this level, then nested component/DZ groups.
  const renderTiles = (uid: string, nodes: FieldNode[]): React.ReactNode => {
    const scalars = nodes.filter((n): n is FieldLeafNode => n.kind === 'field');
    const containers = nodes.filter((n) => n.kind !== 'field') as (ComponentNode | DynamicZoneNode)[];

    return (
      <Box>
        {scalars.length > 0 && (
          <Flex wrap="wrap" gap={3} paddingTop={2} paddingBottom={2}>
            {scalars.map((node) => (
              <FieldTile key={node.key} uid={uid} node={node} />
            ))}
          </Flex>
        )}

        {containers.map((node) => {
          const isDZ = node.kind === 'dynamiczone';
          return (
            <Box key={node.key} paddingTop={3}>
              <Flex gap={2} alignItems="baseline" paddingBottom={1}>
                <Typography variant="sigma" textColor="neutral600">
                  {node.name}
                </Typography>
                <Typography variant="pi" textColor="neutral400">
                  {isDZ
                    ? 'Dynamic zone'
                    : (node as ComponentNode).repeatable
                      ? 'Repeatable component'
                      : 'Component'}
                </Typography>
              </Flex>
              <Box paddingLeft={4}>
                {isDZ
                  ? (node as DynamicZoneNode).components.map((group) => (
                      <Box key={group.key} paddingBottom={2}>
                        <Typography variant="pi" textColor="neutral400">
                          {group.component}
                        </Typography>
                        {renderTiles(uid, group.children)}
                      </Box>
                    ))
                  : renderTiles(uid, (node as ComponentNode).children)}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Main aria-busy={loading}>
      {/* Header — matches the plugin's configuration page header */}
      <Box
        paddingLeft={10}
        paddingRight={10}
        paddingTop={8}
        paddingBottom={8}
        background="neutral100"
        data-strapi-header
      >
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography variant="alpha" tag="h1" fontWeight="bold">
              {formatMessage({
                id: getTranslation('settings.fields.title'),
                defaultMessage: 'Translatable Fields',
              })}
            </Typography>
            <Typography variant="delta" textColor="neutral600" fontWeight="normal">
              {formatMessage({
                id: getTranslation('settings.fields.subtitle'),
                defaultMessage: 'Tap a field to include or exclude it from translation, then Save.',
              })}
            </Typography>
          </Flex>
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            {formatMessage({ id: getTranslation('settings.fields.save'), defaultMessage: 'Save' })}
          </Button>
        </Flex>
      </Box>

      {/* Content */}
      <Box paddingLeft={10} paddingRight={10} paddingBottom={10}>
        {loading ? (
          <Flex justifyContent="center" padding={11}>
            <Loader small>
              {formatMessage({ id: getTranslation('settings.fields.loading'), defaultMessage: 'Loading…' })}
            </Loader>
          </Flex>
        ) : contentTypes.length === 0 ? (
          <EmptyStateLayout
            content={formatMessage({
              id: getTranslation('settings.fields.empty'),
              defaultMessage:
                'No localized content types found. Enable Internationalization on a content type with at least one translatable field to configure it here.',
            })}
          />
        ) : (
          <Accordion.Root defaultValue={contentTypes[0]?.uid} size="M">
            {contentTypes.map((ct) => {
              const allKeys = collectLeafKeys(ct.fields);
              const enabled = countEnabled(ct.uid, allKeys);
              const total = allKeys.length;

              return (
                <Accordion.Item key={ct.uid} value={ct.uid}>
                  <Accordion.Header>
                    <Accordion.Trigger>{ct.displayName}</Accordion.Trigger>
                    <Accordion.Actions>
                      <Badge>{ct.kind === 'singleType' ? 'Single' : 'Collection'}</Badge>
                    </Accordion.Actions>
                  </Accordion.Header>
                  <Accordion.Content>
                    <Box paddingLeft={5} paddingRight={5} paddingTop={3} paddingBottom={4}>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={1}>
                        <Typography variant="pi" fontWeight="bold" textColor={countColor(enabled, total)}>
                          {enabled} / {total}{' '}
                          {formatMessage({
                            id: getTranslation('settings.fields.enabled'),
                            defaultMessage: 'translated',
                          })}
                        </Typography>
                        <Flex gap={2}>
                          <Button
                            variant="tertiary"
                            size="S"
                            disabled={enabled === total}
                            onClick={() => setKeys(ct.uid, allKeys, true)}
                          >
                            {formatMessage({ id: getTranslation('settings.fields.all'), defaultMessage: 'All' })}
                          </Button>
                          <Button
                            variant="tertiary"
                            size="S"
                            disabled={enabled === 0}
                            onClick={() => setKeys(ct.uid, allKeys, false)}
                          >
                            {formatMessage({ id: getTranslation('settings.fields.none'), defaultMessage: 'None' })}
                          </Button>
                        </Flex>
                      </Flex>
                      {renderTiles(ct.uid, ct.fields)}
                    </Box>
                  </Accordion.Content>
                </Accordion.Item>
              );
            })}
          </Accordion.Root>
        )}
      </Box>
    </Main>
  );
};

export { FieldSettings };
