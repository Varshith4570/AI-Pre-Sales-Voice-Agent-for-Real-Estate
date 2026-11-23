/**
 * FACT SHEET — the agent's ONLY source of truth about the project.
 *
 * WHY THIS FILE EXISTS (measured, see evidence/PROVIDER_SELECTION.md):
 * Asked "3 BHK ka price kitna hai?" with no fact sheet, the models answered
 * "12 crores" and "1.45 crore". The real figure is Rs 1.26 crore. A pre-sales
 * agent quoting 10x the real price loses the lead and damages the brand.
 * So prices are never left to model world-knowledge — they are injected.
 *
 * UNKNOWNS are deliberate. The challenge requires "an honest answer when it
 * does not know" (capability #3). Rather than hoping the model refuses, we
 * name the forbidden topics explicitly and test that it refuses them.
 */
export const PROJECT = {
  developer: "Aranya Developers",
  name: "Aranya Greens",
  location: "Tellapur, Serilingampally, Hyderabad",
  status: "under construction",
  units: [
    { config: "2 BHK Compact",  sqft: 1180, price: 8500000,  label: "Rs 85 lakh" },
    { config: "2 BHK Large",    sqft: 1420, price: 10200000, label: "Rs 1.02 crore" },
    { config: "3 BHK Standard", sqft: 1760, price: 12600000, label: "Rs 1.26 crore" },
    { config: "3 BHK Premium",  sqft: 2210, price: 15800000, label: "Rs 1.58 crore" },
  ],
  priceNote: "All-in price. Excludes GST, registration and stamp duty.",
  booking: "Rs 2 lakh, refundable within 15 days",
  paymentPlan: "20:40:40 construction-linked",
  loans: ["SBI", "HDFC", "ICICI"],
  towers: "4 towers, G+14, 428 units, 68% open space",
  possession: "December 2027 for Towers A and B, June 2028 for Towers C and D",
  distances: [
    ["ORR Exit 2 (Nanakramguda)", "6.5 km", "12 min"],
    ["Financial District", "9 km", "18 min"],
    ["Gachibowli", "11 km", "22 min"],
    ["HITEC City", "14 km", "28 min"],
    ["Raidurg Metro", "13 km", "25 min"],
    ["RGIA Airport", "38 km", "40 min"],
  ],
  schools: "Sancta Maria International 4 km, Birla Open Minds 5 km, Oakridge Gachibowli 9 km",
  hospitals: "Citizens Specialty 7 km, Continental 10 km, AIG 11 km",
  amenities: "18,000 sqft clubhouse, pool, gym, badminton, squash, 400 m jogging track, " +
             "kids play area, co-working lounge, 2-level basement parking, 100% DG backup, " +
             "24x7 security with CCTV, STP, rainwater harvesting, EV charging",
  siteOffice: "Open 10:00 to 19:00, all 7 days. Last visit slot 18:00.",
  siteAddress: "Aranya Greens Site Office, Survey No. 142, Tellapur, Hyderabad 502032",
};

/** Topics the agent must REFUSE rather than guess. Tested in tests/honesty. */
export const UNKNOWNS = [
  "RERA registration number",
  "exact floor-wise availability or unit numbers",
  "discounts, offers or negotiated pricing",
  "maintenance charge per sqft",
  "club membership one-time fee",
  "legal or title documents",
  "comparisons against named competitor projects",
];

/** Rendered into the system prompt. Kept compact — every token is paid for per turn. */
export function factBlock() {
  const u = PROJECT.units.map(x => `${x.config} ${x.sqft} sqft = ${x.label}`).join(" | ");
  const d = PROJECT.distances.map(([p, km, t]) => `${p}: ${km} (${t})`).join(", ");
  return `PROJECT: ${PROJECT.name}, ${PROJECT.location}. ${PROJECT.status}.
PRICING: ${u}. ${PROJECT.priceNote} Booking ${PROJECT.booking}. Plan ${PROJECT.paymentPlan}.
Loans approved: ${PROJECT.loans.join(", ")}.
BUILD: ${PROJECT.towers}. Possession: ${PROJECT.possession}.
DISTANCES: ${d}.
SCHOOLS: ${PROJECT.schools}. HOSPITALS: ${PROJECT.hospitals}.
AMENITIES: ${PROJECT.amenities}.
SITE VISIT: ${PROJECT.siteOffice}`;
}
