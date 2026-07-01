import { ImgHTMLAttributes } from 'react';

import { BRAND_ICON_DATA_URI } from './brandIcon';

type PluginIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  width?: number | string;
  height?: number | string;
};

/**
 * The plugin's brand icon (docs/strapi-ai-translator-icon.png), inlined as a data URI.
 * Rendered in the admin menu link, the config page header, and the Translatable Fields page.
 */
const PluginIcon = ({
  width = 24,
  height = 24,
  alt = 'Strapi AI Translator',
  style,
  ...props
}: PluginIconProps) => (
  <img
    src={BRAND_ICON_DATA_URI}
    alt={alt}
    width={width}
    height={height}
    style={{ objectFit: 'contain', display: 'block', ...style }}
    {...props}
  />
);

export { PluginIcon };
