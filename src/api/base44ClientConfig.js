export const BASE44_LOCAL_SERVER_URL = ["http://localhost", "4400"].join(":");

export function createBase44ClientConfig({
  appId,
  source,
  configuredServerUrl,
  isDevelopment,
}) {
  const normalizedAppId = typeof appId === "string" ? appId.trim() : "";
  const normalizedServerUrl = typeof configuredServerUrl === "string" ? configuredServerUrl.trim() : "";

  if (!normalizedAppId) {
    return {
      enabled: false,
      appId: null,
      serverUrl: undefined,
      source: "unknown",
      reason: "APP_ID_UNAVAILABLE"
    };
  }

  const serverUrl = normalizedServerUrl || (isDevelopment ? BASE44_LOCAL_SERVER_URL : undefined);

  return {
    enabled: true,
    appId: normalizedAppId,
    ...(serverUrl ? { serverUrl } : {}),
    source: source || "unknown"
  };
}
