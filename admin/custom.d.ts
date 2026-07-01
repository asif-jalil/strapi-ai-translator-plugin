declare module '@strapi/design-system/*';
declare module '@strapi/design-system';

declare module '@strapi/design-system/*';
declare module '@strapi/design-system';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      [key: string]: string;
    };
  }
}

export interface LLMGenerateRequestBody {
  contentType: ContentType;
  fields: Record<string, any>;
  components: Record<string, any>;
  targetLanguage: string;
}

export interface Form {
  values: Record<string, any>;
  onChange: (data: { target: { name: string; value: any } }) => void;
}

export interface ExtendedContentType {
  isDisplayed: boolean;
  apiID: string;
  pluginOptions?: {
    i18n?: {
      localized?: boolean;
    };
  };
}

export interface TranslationResponse {
  data: Record<string, any>;
  meta: {
    ok: boolean;
    status: number;
    message?: string;
  };
}

export interface TranslatorButtonState {
  variant: 'success' | 'secondary' | 'danger';
  icon: typeof CheckCircle | typeof Magic | typeof WarningCircle;
  loading: boolean;
  disabled: boolean;
  tooltip: string;
  title: string;
}

export interface PluginConfig {
  systemPrompt: string;
}
