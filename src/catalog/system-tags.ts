import type { Tag } from "@/entities"

/** Slugify a tag name to use as part of its system id. */
function slug(name: string): string {
  return name.replaceAll(/[^\w]/g, "").toLowerCase()
}

type SystemTagsTree = Record<string, {
  readonly icon: string
  readonly description?: string
  readonly children?: SystemTagsTree
}>

const TREE: SystemTagsTree = {
  "Bank Charges": {
    icon: "eye-closed",
    description: "Fees, penalties, or service charges applied by banks for account, ATM, or card usage.",
  },
  "Bills": {
    icon: "receipt-text",
    children: {
      "Electricity": { icon: "zap" },
      "Gas": { icon: "gas" },
      "Internet": { icon: "wifi" },
      "Mobile Recharge": { icon: "tablet-smartphone" },
      "DTH": { icon: "satellite-dish" },
      "Water": { icon: "droplet" },
    },
  },
  "Cash Deposit": { icon: "banknote-arrow-up", description: "Cash deposited into a bank account." },
  "Cash Withdrawal": { icon: "banknote-arrow-down", description: "Cash withdrawn from an ATM or bank." },
  "Cashback": {
    icon: "coins",
    description: "Cashback or rewards received from payments or wallets.",
    children: {
      "Google Pay": { icon: "googlepay" },
      "Paytm": { icon: "paytm" },
      "PhonePe": { icon: "phonepe" },
    },
  },
  "Commute": {
    icon: "car-front",
    children: {
      "Auto": { icon: "auto" },
      "Bus": { icon: "bus" },
      "Ola": { icon: "ola" },
      "Uber": { icon: "uber" },
      "Rapido": { icon: "rapido" },
      "Namma Yatri": { icon: "namma-yatri" },
      "Cab": { icon: "car-taxi-front" },
      "Train": { icon: "train-track" },
      "Metro": { icon: "train-front" },
      "Fuel": { icon: "fuel" },
      "Fine": { icon: "whistle" },
      "EV Charge": { icon: "battery-charging" },
      "Local Rental": { icon: "car", description: "Short-term local vehicle rentals like bikes or cars." },
    },
  },
  "Credit & Pay Later": {
    icon: "credit-card",
    description: "Buy now pay later, credit card, or pay-later app transactions.",
    children: {
      "Amazon Pay": { icon: "amazon-pay" },
      "CRED": { icon: "cred" },
      "Credit Card": { icon: "credit-card" },
      "LazyPay": { icon: "lazypay" },
      "Simpl": { icon: "simpl" },
      "Slice": { icon: "slice" },
    },
  },
  "Donation": { icon: "heart-plus", description: "Charitable donations or contributions to a cause." },
  "EMI": {
    icon: "landmark",
    description: "Monthly instalments for loans, education, house, vehicle, or electronics.",
    children: {
      "Education": { icon: "graduation-cap" },
      "Electronics": { icon: "laptop", description: "Electronics bought on instalments or EMI (financed). For an outright purchase, use Shopping → Electronics." },
      "House": { icon: "house" },
      "Vehicle": { icon: "car", description: "Vehicle loan instalments (financed). For vehicle cover, use Insurance → Vehicle." },
    },
  },
  "Entertainment": {
    icon: "monitor-play",
    children: {
      "Bowling": { icon: "bowling" },
      "Movies": { icon: "clapperboard" },
      "Concerts": { icon: "mic" },
      "Shows": { icon: "mic" },
      "Leisure": { icon: "tickets" },
      "Outings": { icon: "handshake" },
    },
  },
  "Events": {
    icon: "calendar",
    children: {
      "Party": { icon: "party-popper" },
      "Spiritual": { icon: "flame" },
      "Wedding": { icon: "gem" },
    },
  },
  "Fitness": {
    icon: "dumbbell",
    children: {
      "Badminton": { icon: "shuttlecock" },
      "Classes": { icon: "calendar-days" },
      "Cricket": { icon: "cricket" },
      "Equipment": { icon: "dumbbell" },
      "Football": { icon: "football" },
      "Gym": { icon: "biceps-flexed" },
      "Nutrition": { icon: "pill-bottle" },
    },
  },
  "Food": {
    icon: "utensils",
    description: "Eating out or ordering in — restaurants, cafés, street food, delivery, and takeaway.",
    children: {
      "Restaurant": { icon: "hand-platter" },
      "Street Food": { icon: "sandwich" },
      "Tea & Coffee": { icon: "coffee" },
      "Delivery": { icon: "bike-fast" },
      "Swiggy": { icon: "swiggy" },
      "Zomato": { icon: "zomato" },
      "Dineout": { icon: "swiggy" },
      "District": { icon: "district" },
      "EazyDiner": { icon: "eazydiner" },
      "Pizza": { icon: "pizza" },
      "Burger": { icon: "hamburger" },
      "Fast Food": { icon: "hamburger" },
      "Takeaway": { icon: "brownbag" },
      "Breakfast": { icon: "croissant" },
      "Juice": { icon: "wine" },
      "Icecream": { icon: "ice-cream-cone" },
      "Tiffin": { icon: "tiffin" },
      "Dessert": { icon: "ice-cream-bowl" },
    },
  },
  "Gift": { icon: "gift", description: "A one-off gift given to someone." },
  "Groceries": {
    icon: "grape",
    children: {
      "Dairy": { icon: "milk" },
      "Bakery": { icon: "croissant" },
      "Chips": { icon: "cookie" },
      "Supermarket": { icon: "shopping-cart" },
      "Zepto": { icon: "zepto" },
      "Instamart": { icon: "swiggy" },
      "Blinkit": { icon: "blinkit" },
    },
  },
  "House": {
    icon: "house",
    children: {
      "Rent Paid": { icon: "house" },
      "Maintenance": { icon: "building", description: "House or society maintenance, repairs, or service charges." },
    },
  },
  "Income": {
    icon: "hand-coins",
    description: "Income from salary, freelance work, rent, interest, or dividends.",
    children: {
      "Interest": { icon: "sparkles", description: "Interest earned from savings accounts, fixed deposits, or investments." },
      "Dividends": { icon: "diamond-percent", description: "Dividend income received from stocks or mutual funds." },
      "Salary": { icon: "banknote-arrow-down" },
      "Freelance": { icon: "laptop", description: "Income earned from freelance, consulting, or contract work." },
      "Rent Received": { icon: "house" },
    },
  },
  "Insurance": {
    icon: "shield-user",
    children: {
      "Health": { icon: "cross" },
      "Life": { icon: "house-heart" },
      "Vehicle": { icon: "car", description: "Vehicle insurance premium. For loan instalments, use EMI → Vehicle." },
    },
  },
  "Investments": {
    icon: "chart-candlestick",
    children: {
      "Fixed Deposits": { icon: "vault" },
      "Gold": { icon: "goldbar" },
      "Silver": { icon: "goldbar" },
      "Mutual Funds": { icon: "sprout" },
      "NPS": { icon: "nps" },
      "PPF": { icon: "ppf" },
      "Recurring Deposit": { icon: "vault" },
      "Stocks": { icon: "chart-candlestick" },
      "ULIP": { icon: "shield-user" },
    },
  },
  "Logistics": {
    icon: "truck",
    description: "Courier, delivery, packers and movers, or shipping services.",
    children: {
      "Packers & Movers": { icon: "truck" },
      "Courier": { icon: "package" },
    },
  },
  "Medical": {
    icon: "pill",
    children: {
      "Clinic": { icon: "stethoscope" },
      "Dentist": { icon: "tooth" },
      "Hospital": { icon: "hospital" },
      "Hygiene": { icon: "sparkles" },
      "Lab Tests": { icon: "syringe" },
      "Medicines": { icon: "pill" },
    },
  },
  "Personal": {
    icon: "user",
    children: {
      "Grooming": { icon: "scissors" },
      "Parlour": { icon: "scissors" },
      "Spa": { icon: "heart" },
    },
  },
  "Pet Care": {
    icon: "paw-print",
    children: {
      "Pet Food": { icon: "soup" },
      "Pet Grooming": { icon: "scissors" },
      "Toys": { icon: "toy-brick" },
      "Vet": { icon: "stethoscope" },
    },
  },
  "Professional": {
    icon: "briefcase-business",
    description: "Fees paid to professionals like CA, lawyer, or consultants.",
    children: {
      "CA": { icon: "glasses" },
      "Legal": { icon: "scale" },
    },
  },
  "Self Transfer": { icon: "arrow-left-right", description: "Transfers between your own bank accounts or wallets." },
  "Services": {
    icon: "user-star",
    description: "Payments for household and personal services like maid, plumber, or driver.",
    children: {
      "Painting": { icon: "paint-roller" },
      "Maid": { icon: "brush-cleaning", description: "Domestic help, cleaning staff, or house help payments." },
      "Cook": { icon: "chef-hat" },
      "Laundry": { icon: "washing-machine", description: "Laundry, dry cleaning, washing, or ironing services." },
      "Electrician": { icon: "cable" },
      "Plumber": { icon: "wrench" },
      "Mechanic": { icon: "car", description: "Vehicle repair, servicing, or garage charges." },
      "Carpenter": { icon: "hammer", description: "Woodwork, furniture repair, or carpentry services." },
      "Driver": { icon: "car", description: "Payments to a personal or hired driver." },
      "Photographer": { icon: "camera" },
      "Tailor": { icon: "sewing", description: "Clothing stitching, alteration, or repair services." },
      "Driving School": { icon: "car", description: "Fees paid to a driving school for lessons or license training." },
    },
  },
  "Shared": { icon: "handshake", description: "Shared expenses or money borrowed, lent, split, or exchanged with friends or family that needs to be settled." },
  "Shopping": {
    icon: "shopping-bag",
    children: {
      "Clothes": { icon: "shirt" },
      "Cosmetics": { icon: "makeup" },
      "Mobile & Accessories": { icon: "tablet-smartphone" },
      "Furniture": { icon: "sofa" },
      "Electronics": { icon: "laptop", description: "Electronics bought outright. For purchases financed on EMI, use EMI → Electronics." },
      "Appliances": { icon: "lamp" },
      "Plants": { icon: "sprout" },
      "Footwear": { icon: "footprints" },
      "Jewellery": { icon: "gem" },
      "Devotional": { icon: "flame" },
    },
  },
  "Support": {
    icon: "heart-plus",
    description: "Recurring financial support or allowance given to family members.",
    children: {
      "Dad": { icon: "father" },
      "Mom": { icon: "mother" },
      "Pocket Money": { icon: "wallet" },
      "Spouse": { icon: "heart-handshake" },
    },
  },
  "Subscription": {
    icon: "calendar-sync",
    children: {
      "Apple": { icon: "apple" },
      "Bumble": { icon: "bumble" },
      "Google": { icon: "google" },
      "Learning": { icon: "graduation-cap" },
      "Netflix": { icon: "netflix" },
      "News": { icon: "newspaper" },
      "Prime": { icon: "amazon-prime-video" },
      "Software": { icon: "app-window" },
      "Spotify": { icon: "spotify" },
      "YouTube": { icon: "youtube" },
    },
  },
  "Tax": {
    icon: "badge-indian-rupee",
    children: {
      "Water Tax": { icon: "badge-indian-rupee" },
      "Property Tax": { icon: "badge-indian-rupee" },
      "Income Tax": { icon: "badge-indian-rupee" },
      "GST": { icon: "badge-indian-rupee" },
    },
  },
  "Travel": {
    icon: "car-front",
    children: {
      "Car": { icon: "car" },
      "Bus": { icon: "bus" },
      "Train": { icon: "train-track" },
      "Flights": { icon: "plane" },
      "FASTag": { icon: "fastag" },
      "Tolls": { icon: "construction" },
      "Lounge": { icon: "armchair" },
      "Car Rental": { icon: "car", description: "Car or bike rentals during local travel." },
    },
  },
  "Trips": {
    icon: "plane",
    children: {
      "Hotel": { icon: "bed" },
      "Hostel": { icon: "backpack" },
      "Meals": { icon: "utensils" },
      "Activities": { icon: "tent-tree" },
      "Airbnb": { icon: "airbnb" },
      "Camping": { icon: "tent" },
      "Visa": { icon: "stamp" },
    },
  },
}

/**
 * Flattened list of Tag rows for system tags. The id is stable across
 * tenants so seeding is idempotent: writing the same row twice is a no-op
 * after the first sync.
 */
export const SYSTEM_TAGS: readonly (Tag & { readonly id: string })[] = (() => {
  const out: (Tag & { id: string })[] = []
  for (const [name, node] of Object.entries(TREE)) {
    const parentId = `system-tag-${slug(name)}`
    out.push({ id: parentId, name, icon: node.icon, description: node.description })
    if (node.children) {
      for (const [childName, child] of Object.entries(node.children)) {
        out.push({
          id: `${parentId}-${slug(childName)}`,
          name: childName,
          icon: child.icon,
          description: child.description,
          parent: parentId,
        })
      }
    }
  }
  return out
})()
