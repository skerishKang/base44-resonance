import { createBase44ClientConfig } from "@/api/base44ClientConfig";

const configuredServerUrl = import.meta.env.VITE_BASE44_APP_BASE_URL?.trim();

const clientConfig = createBase44ClientConfig({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  source: import.meta.env.VITE_BASE44_APP_SOURCE,
  configuredServerUrl,
  isDevelopment: import.meta.env.MODE === "development",
});

const TOKEN_STORAGE_KEY = "base44_access_token";
const TOKEN_URL_PARAM = "access_token";
const ANALYTICS_ENABLE_URL_PARAM = "analytics-enable";

function readStoredSessionToken() {
  if (typeof window === "undefined") return null;
  try {
    const urlToken = new URLSearchParams(window.location.search).get(TOKEN_URL_PARAM);
    if (urlToken) return urlToken;
    return window.localStorage?.getItem(TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function hasStoredBase44Session() {
  return Boolean(readStoredSessionToken());
}

function disableAnalyticsBeforeSdkLoad() {
  if (typeof window === "undefined" || !window.location || typeof window.history?.replaceState !== "function") return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(ANALYTICS_ENABLE_URL_PARAM) === "false") return;
    params.set(ANALYTICS_ENABLE_URL_PARAM, "false");
    const query = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  } catch {
  }
}

let sdkPromise = null;

function loadBase44Sdk() {
  if (!sdkPromise) {
    disableAnalyticsBeforeSdkLoad();
    sdkPromise = import("@base44/sdk");
  }
  return sdkPromise;
}

function createNoopClient() {
  const unavailable = async () => { throw new Error("APP_ID_UNAVAILABLE"); };
  const emptyList = async () => [];
  const emptyNull = async () => null;

  return {
    auth: {
      isAuthenticated: async () => false,
      me: emptyNull,
      loginViaEmailPassword: unavailable,
      register: unavailable,
      verifyOtp: unavailable,
      signInWithOAuth: unavailable,
      signOut: unavailable,
      logout: () => {},
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
    },
    setToken: () => {},
    cleanup: () => {},
  };
}

let clientPromise = null;
let activeClient = null;

async function createLazyBase44Client() {
  if (!clientConfig.enabled) return createNoopClient();
  const { createClient } = await loadBase44Sdk();
  const client = createClient(clientConfig);
  activeClient = client;
  return client;
}

export function getBase44Client() {
  if (!clientPromise) clientPromise = createLazyBase44Client();
  return clientPromise;
}

export function getAuthenticatedBase44Client() {
  return getBase44Client();
}

export function cleanupBase44Client() {
  activeClient?.cleanup?.();
}
