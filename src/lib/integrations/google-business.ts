/**
 * Google Business Profile client (thin fetch wrapper).
 *
 * Endpoints span three Google APIs:
 *  - Account/location info:  mybusinessbusinessinformation.googleapis.com (v1)
 *  - Account list:           mybusinessaccountmanagement.googleapis.com (v1)
 *  - Reviews + replies:      mybusiness.googleapis.com (v4 — reviews never moved to v1)
 *
 * All calls take a fresh access token; token refresh lives in tokens.ts.
 * GBP API access must be requested/approved in Google Cloud Console.
 */

async function gFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google API ${res.status} ${url}: ${await res.text()}`);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

// --- Accounts & locations ---------------------------------------------------

export async function listAccounts(token: string) {
  return gFetch<{ accounts: Array<{ name: string; accountName: string; type: string }> }>(
    token,
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
  );
}

const LOCATION_READ_MASK = [
  "name",
  "title",
  "phoneNumbers",
  "websiteUri",
  "regularHours",
  "categories",
  "profile",
  "storefrontAddress",
  "metadata",
].join(",");

export async function listLocations(token: string, accountName: string) {
  return gFetch<{ locations: Array<Record<string, unknown> & { name: string; title: string }> }>(
    token,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=${LOCATION_READ_MASK}&pageSize=100`,
  );
}

export async function getLocation(token: string, locationName: string) {
  return gFetch<Record<string, unknown> & { name: string; title: string }>(
    token,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=${LOCATION_READ_MASK}`,
  );
}

/**
 * Patch location fields (hours, phone, website, description).
 * `updateMask` must list exactly the fields present in `patch`,
 * e.g. "regularHours,phoneNumbers.primaryPhone".
 */
export async function updateLocation(
  token: string,
  locationName: string,
  patch: Record<string, unknown>,
  updateMask: string,
) {
  return gFetch(
    token,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?updateMask=${encodeURIComponent(updateMask)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

// --- Reviews (legacy v4 API) -------------------------------------------------

export interface GoogleReview {
  name: string; // accounts/{a}/locations/{l}/reviews/{r}
  reviewer: { displayName?: string; profilePhotoUrl?: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

export const STAR_TO_INT: Record<GoogleReview["starRating"], number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export async function listReviews(
  token: string,
  accountName: string,
  locationName: string, // bare "locations/{id}"
  pageToken?: string,
) {
  const url = new URL(
    `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`,
  );
  url.searchParams.set("pageSize", "50");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return gFetch<{ reviews?: GoogleReview[]; nextPageToken?: string; averageRating?: number }>(
    token,
    url.toString(),
  );
}

export async function replyToReview(
  token: string,
  reviewName: string, // full "accounts/{a}/locations/{l}/reviews/{r}"
  comment: string,
) {
  return gFetch(token, `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: "PUT",
    body: JSON.stringify({ comment }),
  });
}

// --- Completeness score -------------------------------------------------------

const COMPLETENESS_CHECKS: Array<{ weight: number; check: (p: any) => boolean; gap: string }> = [
  { weight: 15, gap: "Add business hours", check: (p) => !!p.regularHours?.periods?.length },
  { weight: 15, gap: "Add a phone number", check: (p) => !!p.phoneNumbers?.primaryPhone },
  { weight: 10, gap: "Add your website", check: (p) => !!p.websiteUri },
  { weight: 20, gap: "Write a business description", check: (p) => !!p.profile?.description },
  { weight: 15, gap: "Set your primary category", check: (p) => !!p.categories?.primaryCategory },
  { weight: 15, gap: "Add your address", check: (p) => !!p.storefrontAddress?.addressLines?.length },
  { weight: 10, gap: "Verify your listing", check: (p) => !!p.metadata?.hasVoiceOfMerchant },
];

export function computeCompleteness(profileData: Record<string, unknown>): {
  score: number;
  gaps: string[];
} {
  let score = 0;
  const gaps: string[] = [];
  for (const { weight, check, gap } of COMPLETENESS_CHECKS) {
    if (check(profileData)) score += weight;
    else gaps.push(gap);
  }
  return { score, gaps };
}
