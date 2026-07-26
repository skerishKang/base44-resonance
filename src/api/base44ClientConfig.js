export const BASE44_LOCAL_SERVER_URL = "http://localhost:4400";

export function createBase44ClientConfig({
  appId,
  configuredServerUrl,
  isDevelopment,
}) {
  const normalizedServerUrl =
    typeof configuredServerUrl === "string" ? configuredServerUrl.trim() : "";
  const serverUrl =
    normalizedServerUrl || (isDevelopment ? BASE44_LOCAL_SERVER_URL : undefined);

  return {
    appId,
    ...(serverUrl ? { serverUrl } : {}),
  };
}
