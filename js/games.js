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
    { num:"2609", name:"$100, $200, $500 OR $1,000!", close:null, price:20, prizes:[100,200,500,1000] },
    { num:"2577", name:"$100,000 Cash", close:null, price:5, prizes:[5,10,20,50,100,200,500,1000,100000] },
    { num:"2744", name:"$1,000,000 Ca$h!", close:null, price:20, prizes:[20,100,200,500,1000,5000,1000000] },
    { num:"2658", name:"$1,000,000 Crossword", close:null, price:20, prizes:[20,100,200,500,1000,5000,20000,1000000] },
    { num:"2636", name:"$1,000,000 Riches", close:null, price:10, prizes:[10,20,30,50,100,200,500,1000,5000,1000000] },
    { num:"2400", name:"$20 Million Supreme", close:null, price:100, prizes:[150,200,300,500,1000,10000,100000,20000000] },
    { num:"2668", name:"$250,000 50X Cashword", close:null, price:10, prizes:[10,20,30,40,50,100,200,500,1000,5000,10000,250000] },
    { num:"2633", name:"$3 Million Ca$h", close:"07/15/2026", price:30, prizes:[30,50,100,150,200,300,500,1000,10000,3000000] },
    { num:"2686", name:"$30,000 Gold Rush", close:"07/15/2026", price:2, prizes:[2,5,10,20,50,100,500,1000,30000] },
    { num:"2624", name:"$5 Million Royale", close:null, price:50, prizes:[50,100,150,200,500,1000,10000,5000000] },
    { num:"2627", name:"$5 Million Titanium Black", close:null, price:100, prizes:[150,200,300,500,1000,2500,50000,5000000] },
    { num:"2665", name:"$5,000,000 Fortune", close:null, price:100, prizes:[150,200,300,500,1000,2500,10000,100000,5000000] },
    { num:"2637", name:"$50, $100 OR $500!", close:null, price:10, prizes:[50,100,500] },
    { num:"2742", name:"$500 Frenzy", close:"06/17/2026", price:5, prizes:[5,10,20,50,100,500] },
    { num:"2713", name:"100X The Cash", close:null, price:10, prizes:[10,20,30,50,100,200,500,1000,5000,10000,250000] },
    { num:"2691", name:"100X Sonic Blast", close:"06/28/2026", price:10, prizes:[10,20,30,50,100,200,500,1000,5000,250000] },
    { num:"2714", name:"200X The Cash", close:null, price:20, prizes:[20,30,40,50,100,200,400,500,1000,5000,20000,1000000] },
    { num:"2646", name:"20X The Money", close:null, price:2, prizes:[2,5,10,20,40,50,100,1000,30000] },
    { num:"2711", name:"30X The Cash Word Search", close:null, price:3, prizes:[3,5,10,15,20,30,50,90,100,500,3000,50000] },
    { num:"2589", name:"500X", close:null, price:50, prizes:[50,100,200,300,500,1000,5000,25000,1000000] },
    { num:"2659", name:"500X Loteria Spectacular", close:null, price:50, prizes:[50,75,100,150,200,500,1000,5000,25000,5000000] },
    { num:"2712", name:"50X The Cash", close:null, price:5, prizes:[5,10,15,20,25,50,100,250,500,1000,5000,100000] },
    { num:"2632", name:"777", close:null, price:10, prizes:[10,20,30,40,50,100,200,500,1000,10000,250000] },
    { num:"2680", name:"9 Symbols", close:null, price:1, prizes:[1,2,5,10,20,50,100,150,300,500] },
    { num:"2710", name:"9s In A Line", close:null, price:1, prizes:[1,2,4,5,9,10,19,50,500,9000] },
    { num:"2745", name:"Airstream Dream", close:null, price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,5000,100000] },
    { num:"2727", name:"All About the 8s", close:null, price:5, prizes:[5,10,15,20,50,100,500,1000,5000,100000] },
    { num:"2430", name:"Bonus Break the Bank", close:null, price:5, prizes:[5,10,15,20,50,100,500,5000,100000] },
    { num:"2700", name:"Break the Bank", close:null, price:2, prizes:[2,4,5,10,20,40,50,100,500,1000,30000] },
    { num:"2424", name:"Cash Frenzy", close:null, price:1, prizes:[1,2,3,4,5,10,20,50,500] },
    { num:"2647", name:"Cash Line Bingo", close:null, price:2, prizes:[2,3,5,6,10,15,20,30,50,100,500,1000,30000] },
    { num:"2689", name:"Casino Millions", close:null, price:50, prizes:[50,75,100,150,200,500,1000,5000,25000,1000000] },
    { num:"2662", name:"Cashword", close:null, price:3, prizes:[3,5,10,15,20,30,50,100,500,5000,50000] },
    { num:"2720", name:"Chameleon Cash", close:null, price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,5000,100000] },
    { num:"2656", name:"Crazy 8s", close:null, price:2, prizes:[2,4,8,10,18,20,28,50,80,100,800,8000,30000] },
    { num:"2504", name:"Crossword", close:"07/15/2026", price:3, prizes:[3,5,10,15,20,50,100,500,5000,50000] },
    { num:"2685", name:"Diamond 7s", close:null, price:20, prizes:[20,27,30,40,50,70,100,200,500,1000,7000,1000000] },
    { num:"2673", name:"Easy...1-2-3", close:null, price:1, prizes:[1,2,3,5,10,20,50,100,500] },
    { num:"2683", name:"Emerald 7s", close:null, price:5, prizes:[5,7,10,14,15,20,21,35,50,70,100,500,5000,100000] },
    { num:"2655", name:"Extreme Multiplier", close:null, price:20, prizes:[20,40,60,80,100,200,400,1000,5000,20000,1000000] },
    { num:"2715", name:"Find $200", close:null, price:2, prizes:[2,5,10,20,50,100,200] },
    { num:"2677", name:"Golden Riches", close:null, price:50, prizes:[50,75,100,150,200,500,1000,5000,25000,1000000] },
    { num:"2660", name:"In the Green", close:null, price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,5000,100000] },
    { num:"2671", name:"Instant Millions", close:null, price:20, prizes:[20,30,40,50,100,200,400,500,1000,5000,20000,1000000] },
    { num:"2690", name:"Jurassic Park", close:"06/17/2026", price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,5000,100000] },
    { num:"2739", name:"King of Cash", close:null, price:2, prizes:[2,4,5,10,20,50,100,500,1000,30000] },
    { num:"2676", name:"Limited Edition Mega Loteria", close:null, price:10, prizes:[10,15,20,30,50,100,200,500,1000,5000,10000,250000] },
    { num:"2587", name:"Loteria Supreme", close:null, price:100, prizes:[100,200,300,500,1000,5000,10000,100000,7500000] },
    { num:"2723", name:"Lucky 7s Tripler", close:null, price:5, prizes:[5,7,10,14,15,20,21,35,50,70,100,500,5000,77777] },
    { num:"2705", name:"Lucky Match", close:null, price:10, prizes:[10,20,30,50,100,200,500,1000,5000,10000,250000] },
    { num:"2622", name:"Lucky No. 7", close:null, price:2, prizes:[2,3,6,9,10,18,20,30,60,100,1000,30000] },
    { num:"2733", name:"Mega Cash!", close:null, price:10, prizes:[10,20,30,50,100,200,500,1000,5000,250000] },
    { num:"2669", name:"Mega Loteria", close:null, price:10, prizes:[10,15,20,30,50,100,200,500,1000,5000,10000,250000] },
    { num:"2722", name:"Mega Millionaire", close:null, price:20, prizes:[20,30,40,50,100,200,500,1000,5000,20000,1000000] },
    { num:"2653", name:"Million Dollar Loteria", close:null, price:20, prizes:[20,30,40,50,100,150,200,250,500,1000,5000,20000,1000000] },
    { num:"2730", name:"Millionaire's Club", close:null, price:30, prizes:[30,50,100,150,200,300,500,1000,5000,10000,3000000] },
    { num:"2736", name:"Monaco Cash (Monaco Millionaire Family)", close:null, price:5, prizes:[5,10,20,50,100,500,1000,5000,200000] },
    { num:"2738", name:"Monaco Millionaire", close:null, price:20, prizes:[20,30,50,100,200,500,1000,10000,1000000] },
    { num:"2737", name:"Monaco VIP (Monaco Millionaire Family)", close:null, price:10, prizes:[10,20,50,100,200,500,1000,10000,500000] },
    { num:"2670", name:"Money Money Money", close:"06/17/2026", price:5, prizes:[5,10,15,20,50,100,200,500,1000,5000,100000] },
    { num:"2692", name:"Patriotic Payout", close:"06/28/2026", price:2, prizes:[2,4,5,10,20,50,100,500,1000,30000] },
    { num:"2725", name:"Power 20s", close:null, price:20, prizes:[20,40,60,80,100,200,400,1000,5000,20000,1000000] },
    { num:"2661", name:"Premier Play", close:null, price:30, prizes:[30,50,100,150,200,300,500,1000,10000,3000000] },
    { num:"2706", name:"Queen of Spades", close:null, price:20, prizes:[20,30,40,50,100,200,500,1000,5000,20000,1000000] },
    { num:"2672", name:"Royal Riches", close:null, price:2, prizes:[2,5,10,50,100,1000,30000] },
    { num:"2684", name:"Ruby 7s", close:"06/17/2026", price:10, prizes:[10,17,20,27,50,70,100,170,500,7000,250000] },
    { num:"2724", name:"Slots of Luck", close:null, price:10, prizes:[10,15,20,25,30,50,100,200,500,1000,10000,250000] },
    { num:"2581", name:"Super Crossword", close:"07/12/2026", price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,100000] },
    { num:"2740", name:"Super Crossword", close:null, price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,100000] },
    { num:"2648", name:"Super Loteria", close:null, price:5, prizes:[5,10,15,20,50,100,200,500,5000,100000] },
    { num:"2628", name:"Texas Loteria", close:null, price:3, prizes:[3,5,8,10,15,18,20,30,33,50,80,250,3000,50000] },
    { num:"2610", name:"Ultimate Millions", close:null, price:50, prizes:[75,100,150,250,500,2000,25000,1000000] },
    { num:"2590", name:"X", close:null, price:50, prizes:[75,100,150,200,500,1000,5000,20000,1000000] },
    { num:"2728", name:"Yellowstone", close:null, price:5, prizes:[5,10,15,20,25,50,100,200,500,1000,5000,100000] }
  ]
};

/* ----------------------------------------------------------
   Helper functions
   ---------------------------------------------------------- */

/**
 * Returns the array of games for a given state code, or generates a fallback list of default games.
 * @param {string} stateCode — e.g. 'TX'
 * @returns {Array}
 */
function getGamesForState(stateCode) {
  if (GAMES_BY_STATE[stateCode]) {
    return GAMES_BY_STATE[stateCode];
  }
  const stateInfo = getStateInfo(stateCode);
  const stateName = stateInfo ? stateInfo.name : "State";
  return [
    { num: stateCode + "-2727", name: `${stateName} All About the 8s`, close: null, price: 5, prizes: [5, 10, 15, 20, 50, 100, 500, 1000, 5000, 100000] },
    { num: stateCode + "-2736", name: `${stateName} Monaco Cash`, close: null, price: 5, prizes: [5, 10, 20, 50, 100, 500, 1000, 5000, 200000] },
    { num: stateCode + "-2737", name: `${stateName} Monaco VIP`, close: null, price: 10, prizes: [10, 20, 50, 100, 200, 500, 1000, 10000, 500000] },
    { num: stateCode + "-2738", name: `${stateName} Monaco Millionaire`, close: null, price: 20, prizes: [20, 30, 50, 100, 200, 500, 1000, 10000, 1000000] },
    { num: stateCode + "-01", name: `${stateName} Cash Luck`, close: null, price: 1, prizes: [1, 2, 5, 10, 20, 50, 100, 500] },
    { num: stateCode + "-02", name: `${stateName} Wild 8s`, close: null, price: 2, prizes: [2, 5, 10, 20, 40, 50, 100, 1000, 30000] },
    { num: stateCode + "-03", name: `${stateName} Loteria`, close: null, price: 3, prizes: [3, 5, 8, 10, 15, 18, 20, 30, 50, 80, 250, 3000, 50000] },
    { num: stateCode + "-10", name: `${stateName} 50X the Money`, close: null, price: 10, prizes: [10, 20, 30, 50, 100, 200, 500, 1000, 5000, 1000000] },
    { num: stateCode + "-30", name: `${stateName} $3 Million Cash`, close: null, price: 30, prizes: [30, 50, 100, 150, 200, 300, 500, 1000, 10000, 3000000] },
    { num: stateCode + "-50", name: `${stateName} $5 Million Royale`, close: null, price: 50, prizes: [50, 100, 150, 200, 500, 1000, 10000, 5000000] },
    { num: stateCode + "-100", name: `${stateName} $20 Million Supreme`, close: null, price: 100, prizes: [150, 200, 300, 500, 1000, 10000, 100000, 20000000] }
  ];
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
