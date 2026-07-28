import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

// Resolve the Vite "@/" alias used by production code to a test double, so
// the real productionAdapter.js can be imported and executed under Node.
export function installApiAlias(targetPath) {
  const targetUrl = pathToFileURL(targetPath).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@/api/base44Client") return nextResolve(targetUrl, context);
      return nextResolve(specifier, context);
    },
  });
}
