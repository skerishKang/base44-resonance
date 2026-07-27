import { createClient, getAccessToken } from "@base44/sdk";
import { createBase44ClientConfig } from "@/api/base44ClientConfig";

const configuredServerUrl = import.meta.env.VITE_BASE44_APP_BASE_URL?.trim();

const clientConfig = createBase44ClientConfig({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  source: import.meta.env.VITE_BASE44_APP_SOURCE,
  configuredServerUrl,
  isDevelopment: import.meta.env.MODE === "development",
});

function createNoopClient() {
  const unavailable = async () => { throw new Error("APP_ID_UNAVAILABLE"); };
  const emptyList = async () => [];
  const emptyNull = async () => null;

  return {
    auth: {
      isAuthenticated: async () => false,
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

if (clientConfig.enabled) {
  if (typeof window !== "undefined" && typeof window.XMLHttpRequest !== "undefined") {
    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;
    
    window.XMLHttpRequest.prototype.open = function(method, url) {
      this._isAuthMe = typeof url === "string" && url.includes("/entities/User/me");
      return originalOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function() {
      if (this._isAuthMe) {
        const token = getAccessToken({ saveToStorage: false, removeFromUrl: false });
        if (!token) {
          // Mock a 200 response with empty user data to avoid browser 401 log AND axios error log
          Object.defineProperty(this, 'readyState', { value: 4 });
          Object.defineProperty(this, 'status', { value: 200 });
          Object.defineProperty(this, 'statusText', { value: 'OK' });
          Object.defineProperty(this, 'responseText', { value: 'null' });
          Object.defineProperty(this, 'response', { value: 'null' });
          
          if (this.onreadystatechange) {
            this.onreadystatechange();
          }
          if (this.onload) {
            this.onload();
          }
          return;
        }
      }
      return originalSend.apply(this, arguments);
    };
  }

  const originalMe = base44.auth.me.bind(base44.auth);

  const originalIsAuthenticated = base44.auth.isAuthenticated.bind(base44.auth);
  base44.auth.isAuthenticated = async () => {
    const token = getAccessToken({ saveToStorage: false, removeFromUrl: false });
    if (!token) return false;
    return await originalIsAuthenticated();
  };
}
