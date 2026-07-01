import { describe, it, expect } from "vitest"
import { SYSTEM_TAGS } from "@/catalog/system-tags"

/**
 * Regression lock for the generated system-tag ids.
 *
 * Every seeded system tag has a **stable, content-addressed id**
 * (`system-tag-<slug(name)>` for parents, `<parentId>-<slug(childName)>` for
 * children). That id is what makes seeding idempotent: once a tenant has synced,
 * re-seeding writes the same rows and is a no-op. If an id ever changes, the old
 * row is orphaned and a duplicate is created on every existing device — and any
 * transaction still pointing at the old id silently loses its tag.
 *
 * So these ids are an append-only contract. This file freezes the full set:
 *
 *   - Renaming a tag (its slug feeds the id)               -> FROZEN_IDS mismatch
 *   - Re-homing a child under a different parent           -> FROZEN_IDS mismatch
 *   - Deleting a tag                                        -> FROZEN_IDS mismatch
 *   - Adding a tag                                          -> FROZEN_IDS mismatch
 *
 * A failure here is intentional friction, not a bug. When you deliberately
 * evolve the catalogue:
 *   - ADDING a tag        -> append its id(s) to FROZEN_IDS.
 *   - RENAMING a tag      -> DON'T change the id. Keep the name/id decoupled if
 *                            possible, or treat it as a data migration. Changing
 *                            a shipped id breaks every existing install.
 *   - REMOVING a tag      -> this is a breaking data change; handle the orphaned
 *                            rows explicitly before deleting the id here.
 *
 * The list is derived from and must stay sorted in catalogue (tree) order.
 */
const FROZEN_IDS: readonly string[] = [
  "system-tag-bankcharges",
  "system-tag-bills",
  "system-tag-bills-electricity",
  "system-tag-bills-gas",
  "system-tag-bills-internet",
  "system-tag-bills-mobilerecharge",
  "system-tag-bills-dth",
  "system-tag-bills-water",
  "system-tag-cashdeposit",
  "system-tag-cashwithdrawal",
  "system-tag-cashback",
  "system-tag-cashback-googlepay",
  "system-tag-cashback-paytm",
  "system-tag-cashback-phonepe",
  "system-tag-commute",
  "system-tag-commute-auto",
  "system-tag-commute-bus",
  "system-tag-commute-ola",
  "system-tag-commute-uber",
  "system-tag-commute-rapido",
  "system-tag-commute-nammayatri",
  "system-tag-commute-cab",
  "system-tag-commute-train",
  "system-tag-commute-metro",
  "system-tag-commute-fuel",
  "system-tag-commute-fine",
  "system-tag-commute-evcharge",
  "system-tag-commute-localrental",
  "system-tag-creditpaylater",
  "system-tag-creditpaylater-amazonpay",
  "system-tag-creditpaylater-cred",
  "system-tag-creditpaylater-creditcard",
  "system-tag-creditpaylater-lazypay",
  "system-tag-creditpaylater-simpl",
  "system-tag-creditpaylater-slice",
  "system-tag-donation",
  "system-tag-emi",
  "system-tag-emi-education",
  "system-tag-emi-electronics",
  "system-tag-emi-house",
  "system-tag-emi-vehicle",
  "system-tag-entertainment",
  "system-tag-entertainment-bowling",
  "system-tag-entertainment-movies",
  "system-tag-entertainment-concerts",
  "system-tag-entertainment-shows",
  "system-tag-entertainment-leisure",
  "system-tag-entertainment-outings",
  "system-tag-events",
  "system-tag-events-party",
  "system-tag-events-spiritual",
  "system-tag-events-wedding",
  "system-tag-fitness",
  "system-tag-fitness-badminton",
  "system-tag-fitness-classes",
  "system-tag-fitness-cricket",
  "system-tag-fitness-equipment",
  "system-tag-fitness-football",
  "system-tag-fitness-gym",
  "system-tag-fitness-nutrition",
  "system-tag-food",
  "system-tag-food-restaurant",
  "system-tag-food-streetfood",
  "system-tag-food-teacoffee",
  "system-tag-food-delivery",
  "system-tag-food-swiggy",
  "system-tag-food-zomato",
  "system-tag-food-dineout",
  "system-tag-food-district",
  "system-tag-food-eazydiner",
  "system-tag-food-pizza",
  "system-tag-food-burger",
  "system-tag-food-fastfood",
  "system-tag-food-takeaway",
  "system-tag-food-breakfast",
  "system-tag-food-juice",
  "system-tag-food-icecream",
  "system-tag-food-tiffin",
  "system-tag-food-dessert",
  "system-tag-gift",
  "system-tag-groceries",
  "system-tag-groceries-dairy",
  "system-tag-groceries-bakery",
  "system-tag-groceries-chips",
  "system-tag-groceries-supermarket",
  "system-tag-groceries-zepto",
  "system-tag-groceries-instamart",
  "system-tag-groceries-blinkit",
  "system-tag-house",
  "system-tag-house-rentpaid",
  "system-tag-house-maintenance",
  "system-tag-income",
  "system-tag-income-interest",
  "system-tag-income-dividends",
  "system-tag-income-salary",
  "system-tag-income-freelance",
  "system-tag-income-rentreceived",
  "system-tag-insurance",
  "system-tag-insurance-health",
  "system-tag-insurance-life",
  "system-tag-insurance-vehicle",
  "system-tag-investments",
  "system-tag-investments-fixeddeposits",
  "system-tag-investments-gold",
  "system-tag-investments-silver",
  "system-tag-investments-mutualfunds",
  "system-tag-investments-nps",
  "system-tag-investments-ppf",
  "system-tag-investments-recurringdeposit",
  "system-tag-investments-stocks",
  "system-tag-investments-ulip",
  "system-tag-logistics",
  "system-tag-logistics-packersmovers",
  "system-tag-logistics-courier",
  "system-tag-medical",
  "system-tag-medical-clinic",
  "system-tag-medical-dentist",
  "system-tag-medical-hospital",
  "system-tag-medical-hygiene",
  "system-tag-medical-labtests",
  "system-tag-medical-medicines",
  "system-tag-personal",
  "system-tag-personal-grooming",
  "system-tag-personal-parlour",
  "system-tag-personal-spa",
  "system-tag-petcare",
  "system-tag-petcare-petfood",
  "system-tag-petcare-petgrooming",
  "system-tag-petcare-toys",
  "system-tag-petcare-vet",
  "system-tag-professional",
  "system-tag-professional-ca",
  "system-tag-professional-legal",
  "system-tag-selftransfer",
  "system-tag-services",
  "system-tag-services-painting",
  "system-tag-services-maid",
  "system-tag-services-cook",
  "system-tag-services-laundry",
  "system-tag-services-electrician",
  "system-tag-services-plumber",
  "system-tag-services-mechanic",
  "system-tag-services-carpenter",
  "system-tag-services-driver",
  "system-tag-services-photographer",
  "system-tag-services-tailor",
  "system-tag-services-drivingschool",
  "system-tag-shared",
  "system-tag-shopping",
  "system-tag-shopping-clothes",
  "system-tag-shopping-cosmetics",
  "system-tag-shopping-mobileaccessories",
  "system-tag-shopping-furniture",
  "system-tag-shopping-electronics",
  "system-tag-shopping-appliances",
  "system-tag-shopping-plants",
  "system-tag-shopping-footwear",
  "system-tag-shopping-jewellery",
  "system-tag-shopping-devotional",
  "system-tag-support",
  "system-tag-support-dad",
  "system-tag-support-mom",
  "system-tag-support-pocketmoney",
  "system-tag-support-spouse",
  "system-tag-subscription",
  "system-tag-subscription-apple",
  "system-tag-subscription-bumble",
  "system-tag-subscription-google",
  "system-tag-subscription-learning",
  "system-tag-subscription-netflix",
  "system-tag-subscription-news",
  "system-tag-subscription-prime",
  "system-tag-subscription-software",
  "system-tag-subscription-spotify",
  "system-tag-subscription-youtube",
  "system-tag-tax",
  "system-tag-tax-watertax",
  "system-tag-tax-propertytax",
  "system-tag-tax-incometax",
  "system-tag-tax-gst",
  "system-tag-travel",
  "system-tag-travel-car",
  "system-tag-travel-bus",
  "system-tag-travel-train",
  "system-tag-travel-flights",
  "system-tag-travel-fastag",
  "system-tag-travel-tolls",
  "system-tag-travel-lounge",
  "system-tag-travel-carrental",
  "system-tag-trips",
  "system-tag-trips-hotel",
  "system-tag-trips-hostel",
  "system-tag-trips-meals",
  "system-tag-trips-activities",
  "system-tag-trips-airbnb",
  "system-tag-trips-camping",
  "system-tag-trips-visa",
]

describe("SYSTEM_TAGS generated ids — regression lock", () => {
  const ids = SYSTEM_TAGS.map((t) => t.id)

  it("matches the frozen id set exactly, in catalogue order", () => {
    // Ordered, exact equality: catches deletions, additions, renames (slug
    // change) and re-homing (parent-prefix change) in one assertion. If this
    // fails, see the header comment before "fixing" it by editing FROZEN_IDS.
    expect(ids).toEqual(FROZEN_IDS)
  })

  it("has no duplicate ids (seeding idempotency invariant)", () => {
    const seen = new Map<string, number>()
    for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1)
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)
    expect(dupes, `duplicate system-tag ids: ${dupes.join(", ")}`).toEqual([])
  })

  it("gives every id the required `system-tag-` prefix", () => {
    for (const id of ids) {
      expect(id.startsWith("system-tag-"), `bad id prefix: ${id}`).toBe(true)
    }
  })

  it("uses only slug-safe characters in every id (lowercase word chars + hyphen)", () => {
    // slug() strips everything except [A-Za-z0-9_] and lowercases; ids join
    // slugs with "-". Anything else means the id-generation contract drifted.
    for (const id of ids) {
      expect(/^[a-z0-9_-]+$/.test(id), `non-slug-safe id: ${id}`).toBe(true)
    }
  })

  it("keeps every child id under its declared parent's id prefix", () => {
    // A child's id must be `<parentId>-<childSlug>`. This pins the tree shape:
    // re-homing a child under a new parent changes its id and breaks here.
    const idSet = new Set(ids)
    for (const tag of SYSTEM_TAGS) {
      if (tag.parent === undefined) continue
      expect(idSet.has(tag.parent), `child ${tag.id} references missing parent ${tag.parent}`).toBe(true)
      expect(
        tag.id.startsWith(`${tag.parent}-`),
        `child id ${tag.id} is not prefixed by its parent ${tag.parent}`,
      ).toBe(true)
    }
  })
})
