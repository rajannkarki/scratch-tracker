/* ============================================================
   games.js — Game data & helpers for Scratch-Off Lottery Tracker
   ============================================================ */

/**
 * All 50 US states + DC, sorted alphabetically by name.
 */
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }
];

/**
 * Games keyed by state code. Only TX has data currently.
 */
const GAMES_BY_STATE = {
  TX: [
    { num:"2744", name:"$1,000,000 Ca$h!", close:null, price:20, prizes:[20,100,200,500,1000,5000,1000000] },
    { num:"2658", name:"$1,000,000 Crossword", close:null, price:20, prizes:[20,100,200,500,1000,5000,20000,1000000] },
    { num:"2636", name:"$1,000,000 Riches", close:null, price:10, prizes:[10,20,30,50,100,200,500,1000,5000,1000000] },
    { num:"2609", name:"$100, $200, $500 OR $1,000!", close:null, price:20, prizes:[100,200,500,1000] },
    { num:"2577", name:"$100,000 Cash", close:null, price:5, prizes:[5,10,20,50,100,200,500,1000,100000] },
    { num:"2400", name:"$20 Million Supreme", close:null, price:100, prizes:[150,200,300,500,1000,10000,100000,20000000] },
    { num:"2633", name:"$3 Million Ca$h", close:"07/15/2026", price:30, prizes:[30,50,100,150,200,300,500,1000,10000,3000000] },
    { num:"2624", name:"$5 Million Royale", close:null, price:50, prizes:[50,100,150,200,500,1000,10000,5000000] },
    { num:"2627", name:"$5 Million Titanium Black", close:null, price:100, prizes:[150,200,300,500,1000,2500,50000,5000000] },
    { num:"2637", name:"$50, $100 OR $500!", close:null, price:10, prizes:[50,100,500] },
    { num:"2646", name:"20X The Money", close:null, price:2, prizes:[2,5,10,20,40,50,100,1000,30000] },
    { num:"2589", name:"500X", close:null, price:50, prizes:[50,100,200,300,500,1000,5000,25000,1000000] },
    { num:"2632", name:"777", close:null, price:10, prizes:[10,20,30,40,50,100,200,500,1000,10000,250000] },
    { num:"2680", name:"9 Symbols", close:null, price:1, prizes:[1,2,5,10,20,50,100,150,300,500] },
    { num:"2430", name:"Bonus Break the Bank", close:null, price:5, prizes:[5,10,15,20,50,100,500,5000,100000] },
    { num:"2424", name:"Cash Frenzy", close:null, price:1, prizes:[1,2,3,4,5,10,20,50,500] },
    { num:"2647", name:"Cash Line Bingo", close:null, price:2, prizes:[2,3,5,6,10,15,20,30,50,100,500,1000,30000] },
    { num:"1878", name:"Cash On The Spot", close:"07/02/2026", price:1, prizes:[1,2,3,4,5,10,20,50,500] },
    { num:"2600", name:"Casino Night", close:"06/17/2026", price:10, prizes:[10,15,20,25,30,50,100,200,500,1000,10000,50000,250000] },
    { num:"2504", name:"Crossword", close:"07/15/2026", price:3, prizes:[3,5,10,15,20,50,100,500,5000,50000] },
    { num:"2655", name:"Extreme Multiplier", close:null, price:20, prizes:[20,40,60,80,100,200,400,1000,5000,20000,1000000] },
    { num:"2587", name:"Loteria Supreme", close:null, price:100, prizes:[100,200,300,500,1000,5000,10000,100000,7500000] },
    { num:"2622", name:"Lucky No. 7", close:null, price:2, prizes:[2,3,6,9,10,18,20,30,60,100,1000,30000] },
    { num:"2653", name:"Million Dollar Loteria", close:null, price:20, prizes:[20,30,40,50,100,150,200,250,500,1000,5000,20000,1000000] },
    { num:"2674", name:"Royal Riches", close:null, price:2, prizes:[2,5,10,50,100,1000,30000] },
    { num:"2581", name:"Super Crossword", close:"07/12/2026", price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,100000] },
    { num:"2648", name:"Super Loteria", close:null, price:5, prizes:[5,10,15,20,50,100,200,500,5000,100000] },
    { num:"2628", name:"Texas Loteria", close:null, price:3, prizes:[3,5,8,10,15,18,20,30,33,50,80,250,3000,50000] },
    { num:"2610", name:"Ultimate Millions", close:null, price:50, prizes:[75,100,150,250,500,2000,25000,1000000] },
    { num:"2124", name:"Winning 7s", close:null, price:1, prizes:[1,2,3,4,5,6,10,20,50,500] },
    { num:"2590", name:"X", close:null, price:50, prizes:[75,100,150,200,500,1000,5000,20000,1000000] }
  ]
};

/* ----------------------------------------------------------
   Helper functions
   ---------------------------------------------------------- */

/**
 * Returns the array of games for a given state code, or an empty array.
 * @param {string} stateCode — e.g. 'TX'
 * @returns {Array}
 */
function getGamesForState(stateCode) {
  return GAMES_BY_STATE[stateCode] || [];
}

/**
 * Returns the state object { code, name } for the given code, or undefined.
 * @param {string} stateCode
 * @returns {Object|undefined}
 */
function getStateInfo(stateCode) {
  return US_STATES.find(s => s.code === stateCode);
}

/**
 * Returns true if there are games loaded for the given state code.
 * @param {string} stateCode
 * @returns {boolean}
 */
function hasGamesForState(stateCode) {
  return Array.isArray(GAMES_BY_STATE[stateCode]) && GAMES_BY_STATE[stateCode].length > 0;
}

/**
 * Formats a prize amount into a compact readable string.
 *   1000000 → '$1M'   |   5000000 → '$5M'
 *   1000    → '$1K'   |   25000   → '$25K'
 *   200     → '$200'
 * @param {number} n
 * @returns {string}
 */
function fmtPrize(n) {
  if (n >= 1000000) {
    const millions = n / 1000000;
    return "$" + (Number.isInteger(millions) ? millions : millions.toFixed(1)) + "M";
  }
  if (n >= 1000) {
    const thousands = n / 1000;
    return "$" + (Number.isInteger(thousands) ? thousands : thousands.toFixed(1)) + "K";
  }
  return "$" + n;
}
