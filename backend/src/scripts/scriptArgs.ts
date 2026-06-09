export function getArg(name: string) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : undefined;
}

export function requireArg(name: string) {
  const value = getArg(name);
  if (!value) {
    throw new Error(`Missing required argument: --${name}=value`);
  }

  return value;
}
