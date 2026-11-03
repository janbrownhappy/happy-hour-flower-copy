// Server-side copy of the v3 catalog seed rows. The frontend reads the same
// values from src/lib/filterCatalogs.js; backend code cannot import src/.

export const VENUE_TYPE_SEED = [
  { slug: 'cocktail_bar', name: 'Cocktail Bar', venue_group: 'Bars & Nightlife', definition: 'Craft cocktail focus with a trained bar program.', sort_order: 1 },
  { slug: 'dive_bar', name: 'Dive Bar', venue_group: 'Bars & Nightlife', definition: 'No-frills neighborhood bar, cheap drinks.', sort_order: 2 },
  { slug: 'sports_bar', name: 'Sports Bar', venue_group: 'Bars & Nightlife', definition: 'Built around screens and game-day crowds.', sort_order: 3 },
  { slug: 'wine_bar', name: 'Wine Bar', venue_group: 'Bars & Nightlife', definition: 'Wine-led list with small plates.', sort_order: 4 },
  { slug: 'lounge', name: 'Lounge', venue_group: 'Bars & Nightlife', definition: 'Seated, low-lit, conversation-friendly bar.', sort_order: 5 },
  { slug: 'speakeasy', name: 'Speakeasy', venue_group: 'Bars & Nightlife', definition: 'Hidden or reservation-led intimate bar.', sort_order: 6 },
  { slug: 'nightclub', name: 'Nightclub', venue_group: 'Bars & Nightlife', definition: 'DJ / dance floor venue, late hours.', sort_order: 7 },
  { slug: 'brewery', name: 'Brewery', venue_group: 'Breweries & Taprooms', definition: 'Brews on premises.', sort_order: 8 },
  { slug: 'taproom', name: 'Taproom', venue_group: 'Breweries & Taprooms', definition: 'Draft-focused room, often no full kitchen.', sort_order: 9 },
  { slug: 'distillery', name: 'Distillery', venue_group: 'Breweries & Taprooms', definition: 'Spirits produced on site with a tasting bar.', sort_order: 10 },
  { slug: 'gastropub', name: 'Gastropub', venue_group: 'Restaurants', definition: 'Elevated pub food with a serious drinks list.', sort_order: 11 },
  { slug: 'full_service_casual', name: 'Full-Service Casual', venue_group: 'Restaurants', definition: 'Standard sit-down restaurant with table service.', sort_order: 12 },
  { slug: 'fine_dining', name: 'Fine Dining', venue_group: 'Restaurants', definition: 'Upscale kitchen, higher price point, often reservations.', sort_order: 13 },
  { slug: 'fast_casual', name: 'Fast Casual', venue_group: 'Restaurants', definition: 'Counter-order with quality food, limited service.', sort_order: 14 },
  { slug: 'cafe_coffee', name: 'Café / Coffee', venue_group: 'Cafés & Casual', definition: 'Coffee-forward, daytime-leaning venue.', sort_order: 15 },
  { slug: 'food_hall', name: 'Food Hall', venue_group: 'Cafés & Casual', definition: 'Shared space with multiple vendors and a common bar.', sort_order: 16 },
];

export const CUISINE_SEED = [
  { slug: 'american', name: 'American', cuisine_group: 'Americas', sort_order: 1 },
  { slug: 'southern', name: 'Southern', cuisine_group: 'Americas', sort_order: 2 },
  { slug: 'bbq', name: 'BBQ', cuisine_group: 'Americas', sort_order: 3 },
  { slug: 'cajun_creole', name: 'Cajun / Creole', cuisine_group: 'Americas', sort_order: 4 },
  { slug: 'mexican', name: 'Mexican', cuisine_group: 'Americas', sort_order: 5 },
  { slug: 'tex_mex', name: 'Tex-Mex', cuisine_group: 'Americas', sort_order: 6 },
  { slug: 'latin_american', name: 'Latin American', cuisine_group: 'Americas', sort_order: 7 },
  { slug: 'caribbean', name: 'Caribbean', cuisine_group: 'Americas', sort_order: 8 },
  { slug: 'peruvian', name: 'Peruvian', cuisine_group: 'Americas', sort_order: 9 },
  { slug: 'italian', name: 'Italian', cuisine_group: 'European', sort_order: 10 },
  { slug: 'french', name: 'French', cuisine_group: 'European', sort_order: 11 },
  { slug: 'spanish_tapas', name: 'Spanish / Tapas', cuisine_group: 'European', sort_order: 12 },
  { slug: 'greek', name: 'Greek', cuisine_group: 'European', sort_order: 13 },
  { slug: 'mediterranean', name: 'Mediterranean', cuisine_group: 'European', sort_order: 14 },
  { slug: 'german', name: 'German', cuisine_group: 'European', sort_order: 15 },
  { slug: 'japanese_sushi', name: 'Japanese / Sushi', cuisine_group: 'Asian', sort_order: 16 },
  { slug: 'chinese', name: 'Chinese', cuisine_group: 'Asian', sort_order: 17 },
  { slug: 'thai', name: 'Thai', cuisine_group: 'Asian', sort_order: 18 },
  { slug: 'korean', name: 'Korean', cuisine_group: 'Asian', sort_order: 19 },
  { slug: 'vietnamese', name: 'Vietnamese', cuisine_group: 'Asian', sort_order: 20 },
  { slug: 'indian', name: 'Indian', cuisine_group: 'Asian', sort_order: 21 },
  { slug: 'middle_eastern', name: 'Middle Eastern', cuisine_group: 'Middle East & Africa', sort_order: 22 },
];

// Legacy Venue.category text → v3 venue type slug. Matched on lowercase substring.
export const CATEGORY_TO_VENUE_TYPE = [
  ['cocktail', 'cocktail_bar'],
  ['dive', 'dive_bar'],
  ['sports', 'sports_bar'],
  ['wine', 'wine_bar'],
  ['lounge', 'lounge'],
  ['speakeasy', 'speakeasy'],
  ['night club', 'nightclub'],
  ['nightclub', 'nightclub'],
  ['club', 'nightclub'],
  ['brew', 'brewery'],
  ['taproom', 'taproom'],
  ['tap room', 'taproom'],
  ['distill', 'distillery'],
  ['gastropub', 'gastropub'],
  ['pub', 'gastropub'],
  ['fine dining', 'fine_dining'],
  ['steakhouse', 'fine_dining'],
  ['fast casual', 'fast_casual'],
  ['cafe', 'cafe_coffee'],
  ['café', 'cafe_coffee'],
  ['coffee', 'cafe_coffee'],
  ['food hall', 'food_hall'],
  ['restaurant', 'full_service_casual'],
  ['bar', 'cocktail_bar'],
];

export function venueTypeSlugsForCategory(category) {
  const text = String(category || '').toLowerCase();
  const hits = [];
  for (const [needle, slug] of CATEGORY_TO_VENUE_TYPE) {
    if (text.includes(needle) && !hits.includes(slug)) hits.push(slug);
  }
  return hits.length ? hits : ['full_service_casual'];
}

// Classifies a free-text deal string into the structured HappyHourItem shape the
// derived deal filters query.
const DRINK_CATEGORIES = [
  ['mocktail', 'mocktail'],
  ['zero proof', 'mocktail'],
  ['non-alcoholic', 'mocktail'],
  ['beer', 'beer'],
  ['draft', 'beer'],
  ['draught', 'beer'],
  ['pint', 'beer'],
  ['lager', 'beer'],
  ['ipa', 'beer'],
  ['wine', 'wine'],
  ['sangria', 'wine'],
  ['prosecco', 'wine'],
  ['champagne', 'wine'],
  ['rose', 'wine'],
  ['cocktail', 'cocktail'],
  ['margarita', 'cocktail'],
  ['martini', 'cocktail'],
  ['mule', 'cocktail'],
  ['spritz', 'cocktail'],
  ['seltzer', 'seltzer'],
  ['shot', 'shots'],
  ['whiskey', 'spirits'],
  ['bourbon', 'spirits'],
  ['vodka', 'spirits'],
  ['tequila', 'spirits'],
  ['gin', 'spirits'],
  ['rum', 'spirits'],
  ['well drink', 'spirits'],
  ['liquor', 'spirits'],
];

const FOOD_CATEGORIES = [
  ['dessert', 'dessert'],
  ['wing', 'appetizer'],
  ['app', 'appetizer'],
  ['small plate', 'appetizer'],
  ['nacho', 'appetizer'],
  ['fries', 'appetizer'],
  ['oyster', 'appetizer'],
  ['taco', 'entree'],
  ['burger', 'entree'],
  ['pizza', 'entree'],
  ['sushi', 'entree'],
  ['entree', 'entree'],
  ['sandwich', 'entree'],
];

export function classifyDeal(label, day) {
  const text = String(label || '').toLowerCase();

  let itemType = 'drink';
  let itemCategory = 'other';

  const drinkHit = DRINK_CATEGORIES.find(([needle]) => text.includes(needle));
  const foodHit = FOOD_CATEGORIES.find(([needle]) => text.includes(needle));

  if (drinkHit) {
    itemCategory = drinkHit[1];
  } else if (foodHit) {
    itemType = 'food';
    itemCategory = foodHit[1];
  }

  let dealStyle = 'other';
  if (/half[\s-]?price|1\/2\s?price|50%/.test(text)) dealStyle = 'half_price';
  else if (/bogo|buy one|2 for 1|two for one/.test(text)) dealStyle = 'bogo';
  else if (/combo/.test(text)) dealStyle = 'combo';
  else if (/\$\s?\d/.test(text)) dealStyle = 'fixed_price';
  else if (/\d+\s?(off|% off)/.test(text)) dealStyle = 'dollar_off';

  const priceMatch = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  const price = priceMatch ? Number(priceMatch[1]) : undefined;

  const row = {
    item_type: itemType,
    item_category: itemCategory,
    deal_style: dealStyle,
    label: String(label || '').trim(),
    day: day || '',
    source: 'migration',
  };
  if (price !== undefined && Number.isFinite(price)) row.price = price;
  return row;
}