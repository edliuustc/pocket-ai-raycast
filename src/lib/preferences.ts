export interface Preferences {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  askBackend?: "direct" | "hermes" | "openclaw";
  hermesUrl?: string;
  hermesKey?: string;
  openclawUrl?: string;
  openclawToken?: string;
}
