import { createClient } from "@base44/sdk";
import { createBase44ClientConfig } from "@/api/base44ClientConfig";

const configuredServerUrl = import.meta.env.VITE_BASE44_APP_BASE_URL?.trim();

const clientConfig = createBase44ClientConfig({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  source: import.meta.env.VITE_BASE44_APP_SOURCE,
  configuredServerUrl,
  isDevelopment: import.meta.env.DEV,
});

function createNoopClient() {
  const unavailable = async () => { throw new Error("APP_ID_UNAVAILABLE"); };
  const emptyList = async () => [];
  const emptyNull = async () => null;

  return {
    auth: {
      me: emptyNull,
      signInWithOAuth: unavailable,
      signOut: unavailable,
    },
    entities: new Proxy({}, {
      get: () => ({
        get: emptyNull,
        list: emptyList,
        filter: emptyList,
        create: unavailable,
        update: unavailable,
        delete: unavailable,
        bulkCreate: unavailable,
      })
    }),
    functions: {
      invoke: unavailable,
    }
  };
}

export const base44 = clientConfig.enabled ? createClient(clientConfig) : createNoopClient();
