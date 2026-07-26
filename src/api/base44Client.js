import { createClient } from "@base44/sdk";
import { createBase44ClientConfig } from "@/api/base44ClientConfig";

const configuredServerUrl = import.meta.env.VITE_BASE44_APP_BASE_URL?.trim();

export const base44 = createClient(
  createBase44ClientConfig({
    appId: "6a6538c71a8e3e1640117c91",
    configuredServerUrl,
    isDevelopment: import.meta.env.DEV,
  }),
);
