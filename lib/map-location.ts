const US_COUNTRIES = /^(?:usa|us|u\.s\.?a?\.?|united states(?: of america)?)$/i;
const POSTCODE = /^(?=.*\d)[A-Z0-9][A-Z0-9 -]{2,11}$/i;
const STREET = /^\d+\b|\b(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|court|ct|way|highway|hwy)\b/i;
const ADMIN_AREA = /\b(?:county|parish|borough|district|township)\b/i;
const US_STATE = /^(?:A[LKZR]|C[AOT]|D[EC]|F[LM]|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$/i;

const cleanPart = (value: string) => value.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();

export function compactMapLocation(location: string) {
  const parts = location.split(",").map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return location.trim();

  const country = parts.at(-1)!;
  const isUS = US_COUNTRIES.test(country);
  const hasCountry = isUS || (!POSTCODE.test(country) && !US_STATE.test(country));
  const body = (hasCountry ? parts.slice(0, -1) : parts).filter(part => !POSTCODE.test(part));

  if (isUS || (!hasCountry && US_STATE.test(body.at(-1) || ""))) {
    const state = cleanPart(body.at(-1) || "");
    const city = [...body.slice(0, -1)].reverse().find(part => !ADMIN_AREA.test(part) && !STREET.test(part));
    return city && state ? `${city}, ${state}` : parts.join(", ");
  }

  const foreignBody = body[0] && STREET.test(body[0]) ? body.slice(1) : body;
  const city = foreignBody.length > 1 ? foreignBody.at(-2) : foreignBody[0];
  return city && country ? `${city}, ${country}` : parts.join(", ");
}
