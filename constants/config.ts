import Constants from "expo-constants";

const deriveDevServerHost = () => {
  const expoHost =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest as { hostUri?: string } | null)?.hostUri ??
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;

  if (!expoHost) {
    return null;
  }

  const host = expoHost.split(":")[0];
  return host || null;
};

const derivedBaseUrl = (() => {
  const host = deriveDevServerHost();
  if (!host) {
    return null;
  }
  return `http://${host}:3000/api`;
})();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? derivedBaseUrl ?? "http://localhost:3000/api";
