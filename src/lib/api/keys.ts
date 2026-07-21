export type KeyFamily = "POLYMARKET" | "KALSHI";

/**
 * Dual-key rotation: PRIMARY / SECONDARY with ACTIVE selector.
 * Rotate by flipping *_ACTIVE_KEY without redeploying secrets mid-flight.
 */
export function getActiveApiKey(family: KeyFamily): string | undefined {
  const active = (process.env[`${family}_ACTIVE_KEY`] ?? "primary").toLowerCase();
  const primary = process.env[`${family}_API_KEY`]?.trim();
  const secondary = process.env[`${family}_API_KEY_SECONDARY`]?.trim();

  if (active === "secondary") {
    return secondary || primary || undefined;
  }
  return primary || secondary || undefined;
}

export function getKeyRotationStatus(family: KeyFamily) {
  return {
    family,
    active: (process.env[`${family}_ACTIVE_KEY`] ?? "primary").toLowerCase(),
    hasPrimary: Boolean(process.env[`${family}_API_KEY`]?.trim()),
    hasSecondary: Boolean(process.env[`${family}_API_KEY_SECONDARY`]?.trim()),
  };
}
