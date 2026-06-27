type RiderLike = {
  id: string;
  riderId?: string | null;
  name: string;
};

type WaiverLike = {
  riderId: string | null;
  riderName: string;
  status?: string;
};

export function normalizeRiderName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function nameContainsWholeName(a: string, b: string) {
  const left = ` ${normalizeRiderName(a)} `;
  const right = ` ${normalizeRiderName(b)} `;
  return left.includes(right) || right.includes(left);
}

export function waiverMatchesRiderName(riderName: string, waiverName: string) {
  const rider = normalizeRiderName(riderName);
  const waiver = normalizeRiderName(waiverName);
  if (!rider || !waiver) return false;
  if (rider === waiver) return true;
  return nameContainsWholeName(rider, waiver);
}

export function isWaiverSignedForRider(
  rider: RiderLike,
  waivers: WaiverLike[],
  allRiders: RiderLike[] = [rider]
) {
  const signedWaivers = waivers.filter((waiver) => !waiver.status || waiver.status === "SIGNED");

  if (rider.riderId && signedWaivers.some((waiver) => waiver.riderId === rider.riderId)) {
    return true;
  }

  const riderName = normalizeRiderName(rider.name);
  if (signedWaivers.some((waiver) => normalizeRiderName(waiver.riderName) === riderName)) {
    return true;
  }

  const possibleWaivers = signedWaivers.filter((waiver) => waiverMatchesRiderName(rider.name, waiver.riderName));
  if (possibleWaivers.length !== 1) return false;

  const matchedWaiver = possibleWaivers[0];
  const otherMatchingRiders = allRiders.filter((candidate) => {
    if (candidate.id === rider.id) return false;
    return waiverMatchesRiderName(candidate.name, matchedWaiver.riderName);
  });

  return otherMatchingRiders.length === 0;
}
