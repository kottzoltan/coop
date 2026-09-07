/** Netlify runtime global — nem importálható @netlify/functions-ből (esbuild után undefined). */
export function envGet(key: string): string | undefined {
  const netlify = (globalThis as {
    Netlify?: { env?: { get: (name: string) => string | undefined } };
  }).Netlify;
  if (netlify?.env?.get) return netlify.env.get(key);
  return process.env[key];
}
