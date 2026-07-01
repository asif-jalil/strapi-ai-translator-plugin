import { ImgHTMLAttributes } from 'react';

import { BRAND_ICON_DATA_URI } from './brandIconData';

type BrandIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  width?: number | string;
  height?: number | string;
};

/**
 * The plugin's brand image (docs/strapi-ai-translator-icon.png), inlined as a data URI.
 * Used on the configuration page header. The left-nav menu keeps the default PluginIcon.
 */
const BrandIcon = ({
  width = 24,
  height = 24,
  alt = 'Strapi AI Translator',
  style,
  ...props
}: BrandIconProps) => (
  <img
    src={BRAND_ICON_DATA_URI}
    alt={alt}
    width={width}
    height={height}
    style={{ objectFit: 'contain', display: 'block', ...style }}
    {...props}
  />
);

export { BrandIcon };
