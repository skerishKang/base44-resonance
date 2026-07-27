import { createClient } from "@base44/sdk";
import { createBase44ClientConfig } from "@/api/base44ClientConfig";

const configuredServerUrl = import.meta.env.VITE_BASE44_APP_BASE_URL?.trim();

export const base44 = createClient(
  createBase44ClientConfig({
    appId: import.meta.env.VITE_BASE44_APP_ID,
    configuredServerUrl,
    isDevelopment: import.meta.env.DEV,
  }),
);
