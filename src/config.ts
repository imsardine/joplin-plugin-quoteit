export interface QuoteConfig {
  attributionPrefix: string;
}

// Shared defaults until user-configurable settings are implemented.
export const config: Readonly<QuoteConfig> = Object.freeze({
  attributionPrefix: '-- ',
});
