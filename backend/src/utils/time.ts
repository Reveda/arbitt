const durationToMsMap = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;

export function durationToMs(duration: string) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2] as keyof typeof durationToMsMap;

  return value * durationToMsMap[unit];
}

export function addDuration(date: Date, duration: string) {
  return new Date(date.getTime() + durationToMs(duration));
}
