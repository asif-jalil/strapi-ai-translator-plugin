import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  Accordion,
  Box,
  Button,
  EmptyStateLayout,
  Flex,
  Loader,
  Main,
  Switch,
  Typography,
} from '@strapi/design-system';
import { Check, Database, Feather, Lock, PuzzlePiece, Stack } from '@strapi/icons';

import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../../src/pluginId';
import { PluginIcon } from '../../src/components/PluginIcon';

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

const INDENT_STEP = 22; // px per nesting level

const TYPE_COLORS: Record<string, [string, string]> = {
  string: ['primary100', 'primary600'],
  text: ['primary100', 'primary600'],
  email: ['primary100', 'primary600'],
  richtext: ['alternative100', 'alternative600'],
  richText: ['alternative100', 'alternative600'],
  blocks: ['alternative100', 'alternative600'],
  json: ['warning100', 'warning600'],
  uid: ['success100', 'success600'],
};
const typeColors = (type: string): [string, string] => TYPE_COLORS[type] || ['neutral150', 'neutral600'];

/* ---- styled rows ---------------------------------------------------------- */
const RowBase = styled(Flex)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;
const LeafRow = styled(RowBase)`
  transition: background-color 120ms ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }
`;
const ComponentRow = styled(RowBase)`
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-left: 3px solid ${({ theme }) => theme.colors.alternative500};
`;
const ZoneRow = styled(RowBase)`
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-left: 3px solid ${({ theme }) => theme.colors.secondary500};
`;
const SubComponentRow = styled(RowBase)`
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-left: 3px solid ${({ theme }) => theme.colors.neutral300};
`;

const Tag = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
  <Flex background={bg} hasRadius paddingLeft={2} paddingRight={2} shrink={0}>
    <Typography
      variant="pi"
      fontWeight="bold"
      textColor={fg}
      style={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}
    >
      {label}
    </Typography>
  </Flex>
);

const IconChip = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <Flex
    background={bg}
    hasRadius
    alignItems="center"
    justifyContent="center"
    shrink={0}
    style={{ width: 28, height: 28 }}
  >
    {children}
  </Flex>
);

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
  const areAllEnabled = (uid: string, keys: string[]): boolean =>
    keys.length > 0 && keys.every((key) => isEnabled(uid, key));
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

  const indentStyle = (depth: number): React.CSSProperties => ({
    paddingLeft: 24 + depth * INDENT_STEP,
    minWidth: 0,
  });

  // Right-hand control: a colored On/Off label + the switch (keeps the right column full).
  const LeafControl = ({ uid, fieldKey, name }: { uid: string; fieldKey: string; name: string }) => {
    const on = isEnabled(uid, fieldKey);
    return (
      <Flex gap={2} alignItems="center" shrink={0}>
        <Typography
          variant="pi"
          fontWeight="bold"
          textColor={on ? 'success600' : 'neutral400'}
          style={{ width: 24, textAlign: 'right' }}
        >
          {on ? 'On' : 'Off'}
        </Typography>
        <Switch
          checked={on}
          onCheckedChange={(checked: boolean) => setKeys(uid, [fieldKey], checked)}
          aria-label={`Toggle ${name}`}
        />
      </Flex>
    );
  };

  const GroupControl = ({ uid, keys, label }: { uid: string; keys: string[]; label: string }) =>
    keys.length > 0 ? (
      <Box shrink={0}>
        <Switch
          checked={areAllEnabled(uid, keys)}
          onCheckedChange={(checked: boolean) => setKeys(uid, keys, checked)}
          aria-label={label}
        />
      </Box>
    ) : null;

  const commonRowProps = {
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingTop: 3,
    paddingBottom: 3,
    paddingRight: 6,
  };

  // Flatten the tree into aligned rows.
  const buildRows = (uid: string, nodes: FieldNode[], depth: number): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];

    nodes.forEach((node) => {
      if (node.kind === 'field') {
        const { translatable } = node;
        const [bg, fg] = translatable ? typeColors(node.type) : ['neutral150', 'neutral500'];
        rows.push(
          <LeafRow key={node.key} {...commonRowProps}>
            <Flex alignItems="center" gap={3} style={indentStyle(depth)}>
              {!translatable && <Lock width={14} height={14} fill="neutral400" />}
              <Typography
                variant="omega"
                fontWeight={translatable ? 'semiBold' : 'regular'}
                textColor={translatable ? 'neutral800' : 'neutral500'}
                ellipsis
              >
                {node.name}
              </Typography>
              <Tag label={node.type} bg={bg} fg={fg} />
            </Flex>
            {translatable ? (
              <LeafControl uid={uid} fieldKey={node.key} name={node.name} />
            ) : (
              <Typography variant="pi" textColor="neutral400" style={{ flexShrink: 0 }}>
                not translatable
              </Typography>
            )}
          </LeafRow>
        );
      } else if (node.kind === 'component') {
        const keys = collectLeafKeys([node]);
        rows.push(
          <ComponentRow key={node.key} {...commonRowProps}>
            <Flex alignItems="center" gap={3} style={indentStyle(depth)}>
              <IconChip bg="alternative100">
                <PuzzlePiece width={16} height={16} fill="alternative600" />
              </IconChip>
              <Typography variant="omega" fontWeight="bold" ellipsis>
                {node.name}
              </Typography>
              <Tag
                label={node.repeatable ? 'repeatable' : 'component'}
                bg="alternative100"
                fg="alternative600"
              />
            </Flex>
            <GroupControl uid={uid} keys={keys} label={`Toggle all in ${node.name}`} />
          </ComponentRow>
        );
        rows.push(...buildRows(uid, node.children, depth + 1));
      } else {
        const dzKeys = collectLeafKeys([node]);
        rows.push(
          <ZoneRow key={node.key} {...commonRowProps}>
            <Flex alignItems="center" gap={3} style={indentStyle(depth)}>
              <IconChip bg="secondary100">
                <Stack width={16} height={16} fill="secondary600" />
              </IconChip>
              <Typography variant="omega" fontWeight="bold" ellipsis>
                {node.name}
              </Typography>
              <Tag label="dynamic zone" bg="secondary100" fg="secondary600" />
            </Flex>
            <GroupControl uid={uid} keys={dzKeys} label={`Toggle all in ${node.name}`} />
          </ZoneRow>
        );
        node.components.forEach((group) => {
          const groupKeys = collectLeafKeys(group.children);
          rows.push(
            <SubComponentRow key={group.key} {...commonRowProps} paddingTop={2} paddingBottom={2}>
              <Flex alignItems="center" gap={2} style={indentStyle(depth + 1)}>
                <PuzzlePiece width={14} height={14} fill="neutral500" />
                <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                  {group.component}
                </Typography>
              </Flex>
              <GroupControl uid={uid} keys={groupKeys} label={`Toggle ${group.component}`} />
            </SubComponentRow>
          );
          rows.push(...buildRows(uid, group.children, depth + 2));
        });
      }
    });

    return rows;
  };

  const countColor = (enabled: number, total: number): string => {
    if (total === 0) return 'neutral500';
    if (enabled === 0) return 'danger600';
    if (enabled === total) return 'success600';
    return 'neutral600';
  };

  return (
    <Main aria-busy={loading}>
      {/* Hero header */}
      <Box paddingLeft={10} paddingRight={10} paddingBottom={8} paddingTop={8} background="neutral100">
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Flex alignItems="center" gap={3}>
              <PluginIcon width={40} height={40} />
              <Typography variant="alpha" tag="h1" fontWeight="bold">
                {formatMessage({
                  id: getTranslation('settings.fields.title'),
                  defaultMessage: 'Translatable Fields',
                })}
              </Typography>
            </Flex>
            <Box maxWidth="640px">
              <Typography variant="epsilon" textColor="neutral600" fontWeight="normal">
                {formatMessage({
                  id: getTranslation('settings.fields.description'),
                  defaultMessage:
                    'Choose which fields the AI Translator should translate. Fields turned off are excluded from translation and left untouched in the response.',
                })}
              </Typography>
            </Box>
          </Flex>
          <Button startIcon={<Check />} onClick={handleSave} loading={saving} disabled={loading} size="L">
            {formatMessage({ id: getTranslation('settings.fields.save'), defaultMessage: 'Save' })}
          </Button>
        </Flex>
      </Box>

      {/* Content */}
      <Box paddingLeft={10} paddingRight={10} paddingTop={6} paddingBottom={10}>
        {loading ? (
          <Flex justifyContent="center" padding={10}>
            <Loader>
              {formatMessage({ id: getTranslation('settings.fields.loading'), defaultMessage: 'Loading…' })}
            </Loader>
          </Flex>
        ) : contentTypes.length === 0 ? (
          <Box background="neutral0" hasRadius shadow="filterShadow" padding={8}>
            <EmptyStateLayout
              icon={<PluginIcon width={64} height={64} />}
              content={formatMessage({
                id: getTranslation('settings.fields.empty'),
                defaultMessage:
                  'No localized content types found. Enable Internationalization on a content type with at least one translatable field to configure it here.',
              })}
            />
          </Box>
        ) : (
          <Accordion.Root defaultValue={contentTypes[0]?.uid} size="M">
            {contentTypes.map((ct) => {
              const allKeys = collectLeafKeys(ct.fields);
              const enabled = countEnabled(ct.uid, allKeys);
              const total = allKeys.length;
              const isSingle = ct.kind === 'singleType';
              const rows = buildRows(ct.uid, ct.fields, 0);

              return (
                <Accordion.Item key={ct.uid} value={ct.uid}>
                  <Accordion.Header>
                    <Accordion.Trigger icon={isSingle ? Feather : Database} description={ct.uid}>
                      {ct.displayName}
                    </Accordion.Trigger>
                    <Accordion.Actions>
                      <Flex gap={2} alignItems="center" style={{ flexShrink: 0 }}>
                        <Tag label={isSingle ? 'Single' : 'Collection'} bg="neutral150" fg="neutral600" />
                        <Box style={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="pi" fontWeight="bold" textColor={countColor(enabled, total)}>
                            {enabled}/{total} on
                          </Typography>
                        </Box>
                        <Button
                          variant="tertiary"
                          size="S"
                          disabled={enabled === total}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setKeys(ct.uid, allKeys, true);
                          }}
                        >
                          {formatMessage({ id: getTranslation('settings.fields.all'), defaultMessage: 'All' })}
                        </Button>
                        <Button
                          variant="tertiary"
                          size="S"
                          disabled={enabled === 0}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setKeys(ct.uid, allKeys, false);
                          }}
                        >
                          {formatMessage({ id: getTranslation('settings.fields.none'), defaultMessage: 'None' })}
                        </Button>
                      </Flex>
                    </Accordion.Actions>
                  </Accordion.Header>
                  <Accordion.Content>{rows}</Accordion.Content>
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
