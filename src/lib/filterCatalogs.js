// Seed data for the v3 catalog entities (VenueType, Cuisine). The backend seed
// function bulk-creates these, and the admin pickers read the entities — this
// module is the single source of truth for both.

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

// Curated venue types surfaced as one-tap quick-filter chips on Explore, in
// display order. The rest stay available in the full filter panel.
export const QUICK_VENUE_TYPE_SLUGS = [
  'cocktail_bar', 'dive_bar', 'sports_bar', 'brewery', 'gastropub', 'wine_bar',
];

// Derived deal filters — each queries the venue's HappyHourItem rows rather than
// relying on someone remembering to tag an amenity.
export const DEAL_FILTERS = [
  { id: 'beer_deal', label: 'Beer deals', match: (i) => i.item_category === 'beer' },
  { id: 'wine_deal', label: 'Wine deals', match: (i) => i.item_category === 'wine' },
  { id: 'cocktail_deal', label: 'Cocktail deals', match: (i) => i.item_category === 'cocktail' },
  { id: 'mocktail_deal', label: 'Mocktail deals', match: (i) => i.item_category === 'mocktail' },
  { id: 'food_deal', label: 'Food deals', match: (i) => i.item_type === 'food' },
  { id: 'half_price', label: 'Half-price', match: (i) => i.deal_style === 'half_price' },
  { id: 'bogo', label: 'BOGO', match: (i) => i.deal_style === 'bogo' },
];