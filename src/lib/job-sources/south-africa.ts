/**
 * Shared South Africa-only job filtering.
 *
 * Public job boards often return worldwide/European remote roles. GradConnect's
 * job feed is intentionally local, so a listing must name South Africa, a
 * South African province, or a recognised South African city/area.
 */
export const SOUTH_AFRICA_LOCATION_TERMS = [
  "South Africa",
  "Gauteng",
  "Western Cape",
  "Eastern Cape",
  "Northern Cape",
  "Free State",
  "KwaZulu-Natal",
  "KwaZulu Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Johannesburg",
  "Pretoria",
  "Tshwane",
  "Centurion",
  "Midrand",
  "Sandton",
  "Randburg",
  "Roodepoort",
  "Soweto",
  "Kempton Park",
  "Boksburg",
  "Benoni",
  "Germiston",
  "Alberton",
  "Cape Town",
  "Stellenbosch",
  "Paarl",
  "Bellville",
  "George",
  "Durban",
  "Umhlanga",
  "Pietermaritzburg",
  "Bloemfontein",
  "Gqeberha",
  "Port Elizabeth",
  "East London",
  "Polokwane",
  "Mbombela",
  "Nelspruit",
  "Rustenburg",
  "Potchefstroom",
  "Vanderbijlpark",
  "Vereeniging",
  "Kimberley",
] as const;

const SOUTH_AFRICA_LOCATION_REGEX = new RegExp(
  `(?:${SOUTH_AFRICA_LOCATION_TERMS.map((term) =>
    term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"),
  ).join("|")}|\\bZA\\b|\\bKZN\\b)`,
  "i",
);

export function isSouthAfricanLocation(location?: string | null) {
  if (!location) return false;
  return SOUTH_AFRICA_LOCATION_REGEX.test(location);
}

/**
 * Prisma-compatible location filter used to keep old foreign records that may
 * already exist in the database off the Jobs page/API.
 */
export const southAfricaLocationWhere = {
  OR: SOUTH_AFRICA_LOCATION_TERMS.map((term) => ({
    location: { contains: term, mode: "insensitive" as const },
  })),
};
