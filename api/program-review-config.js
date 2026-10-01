export const PROGRAM_REVIEW_CONFIGURATION_VERSION = "program-review-config-v1";

export const PROGRAM_REVIEW_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "firstHome",
    eligibilityKey: "firstHome",
    label: "OHCS Flex Lending FirstHome: LMI + purchase-price review",
    shortLabel: "OHCS FirstHome LMI + purchase-price reviewed",
    states: Object.freeze(["OR"]),
    sourceLabel: "OHCS FirstHome county targeted/non-targeted purchase-price limits and FFIEC LMI tract context",
    sourceRetrievedOn: "2026-08-19",
    localReviewOverrideSupported: true,
    disclosure: "OHCS FirstHome review requires the saved Oregon listing to match the configured FFIEC LMI tract context and the applicable targeted or non-targeted OHCS purchase-price limit. It does not determine borrower, property, program, lender, underwriting, or approval eligibility.",
  }),
  Object.freeze({
    id: "fhfaCountyLimit",
    eligibilityKey: "fhfaCountyLimit",
    label: "FHFA 2026: county listing-price review",
    shortLabel: "FHFA 2026 county listing-price reviewed",
    states: Object.freeze(["OR", "WA", "ID", "CA"]),
    sourceLabel: "FHFA 2026 county-and-unit values",
    disclosure: "FHFA county review is a 2026 listed-price context only. It is not a loan amount, property eligibility, borrower qualification, rate, or approval decision.",
  }),
  Object.freeze({
    id: "calhfaMyHome",
    eligibilityKey: "calhfaMyHome",
    label: "CalHFA MyHome: property context review",
    shortLabel: "CalHFA MyHome property-context reviewed",
    states: Object.freeze(["CA"]),
    sourceLabel: "CalHFA MyHome published property categories",
    disclosure: "CalHFA MyHome property context is limited to California one-unit listing categories published by CalHFA. It has no general sales-price cap and does not determine income, first-time status, occupancy, counseling, lender approval, or eligibility.",
  }),
  Object.freeze({
    id: "idahoMrbTaxExempt",
    eligibilityKey: "idahoMrbTaxExempt",
    label: "Idaho Housing: Tax-Exempt/MRB price review",
    shortLabel: "Idaho Housing Tax-Exempt/MRB county price reviewed",
    states: Object.freeze(["ID"]),
    sourceLabel: "Authorized IHFA 2026 county listed-price chart",
    disclosure: "Idaho Housing Tax-Exempt/MRB review uses the authorized 2026 county listed-price chart only. It does not verify income, first-time status, targeted-area qualification, property eligibility, occupancy, lender requirements, underwriting, or approval.",
  }),
  Object.freeze({
    id: "lakeviewNational",
    eligibilityKey: "lakeviewNational",
    label: "Lakeview National: Nationwide 140% AMI review screen",
    shortLabel: "Lakeview National review-screened",
    states: Object.freeze(["OR", "WA", "CA", "ID", "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WV", "WI", "WY"]),
    sourceLabel: "Fannie Mae 140% Area Median Income (AMI) county limits and GeoSphere review policy",
    disclosure: "Lakeview National is a nationwide listing-review screen requiring borrower income to be at or below 140% Fannie Mae Area Median Income (AMI) for the county. It does not verify income, credit, AUS, DTI, LTV/CLTV, occupancy, program availability, property eligibility, or underwriting.",
  }),
]);

export function getProgramReviewConfiguration() {
  return {
    version: PROGRAM_REVIEW_CONFIGURATION_VERSION,
    programs: PROGRAM_REVIEW_DEFINITIONS.map((definition) => ({
      id: definition.id,
      eligibilityKey: definition.eligibilityKey,
      label: definition.label,
      shortLabel: definition.shortLabel,
      states: [...definition.states],
      sourceLabel: definition.sourceLabel,
      sourceRetrievedOn: definition.sourceRetrievedOn ?? null,
      localReviewOverrideSupported: definition.localReviewOverrideSupported === true,
      disclosure: definition.disclosure,
    })),
  };
}

export function getProgramReviewDefinition(programId) {
  return PROGRAM_REVIEW_DEFINITIONS.find((definition) => definition.id === programId) ?? null;
}
