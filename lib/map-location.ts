const US_COUNTRIES = /^(?:usa|us|u\.s\.?a?\.?|united states(?: of america)?)$/i;
const POSTCODE = /^(?=.*\d)[A-Z0-9][A-Z0-9 -]{2,11}$/i;
const STREET = /^\d+\b|\b(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|court|ct|way|highway|hwy)\b/i;
const ADMIN_AREA = /\b(?:county|parish|borough|district|township)\b/i;
const US_STATE = /^(?:A[LKZR]|C[AOT]|D[EC]|F[LM]|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$/i;
const STATE_NAMES:Record<string,string>={alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",connecticut:"CT",delaware:"DE",florida:"FL",georgia:"GA",hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",mississippi:"MS",missouri:"MO",montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND",ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD",tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY","district of columbia":"DC"};

const cleanPart = (value: string) => value.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();

export function compactMapLocation(location: string) {
  const original=location.trim(),parts = original.split(",").map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return original;

  const country = parts.at(-1)!;
  const isUS = US_COUNTRIES.test(country);
  const countryValue=cleanPart(country);
  const hasCountry = isUS || (!POSTCODE.test(country) && !US_STATE.test(countryValue) && !STATE_NAMES[countryValue.toLowerCase()]);
  const body = (hasCountry ? parts.slice(0, -1) : parts).filter(part => !/^\d{5}(?:-\d{4})?$/.test(part));

  const statePart=[...body].map((part,index)=>({index,value:cleanPart(part)})).reverse().find(({value})=>US_STATE.test(value)||Boolean(STATE_NAMES[value.toLowerCase()]));
  if (isUS || statePart) {
    const stateValue=statePart?.value||"",state=STATE_NAMES[stateValue.toLowerCase()]||stateValue.toUpperCase();
    const city = [...body.slice(0,statePart?.index??body.length)].reverse().find(part => !ADMIN_AREA.test(part) && !STREET.test(part) && !POSTCODE.test(part));
    if(city&&state)return `${city}, ${state}`;
    const nonAdministrative=body.find(part=>!ADMIN_AREA.test(part)&&!STREET.test(part)&&!POSTCODE.test(part)&&part!==stateValue);
    return nonAdministrative&&state?`${nonAdministrative}, ${state}`:state||original;
  }

  const foreignBody = body[0] && STREET.test(body[0]) ? body.slice(1) : body;
  const city = foreignBody.find(part=>!ADMIN_AREA.test(part)&&!POSTCODE.test(part));
  return city && country ? `${city}, ${country}` : original;
}
