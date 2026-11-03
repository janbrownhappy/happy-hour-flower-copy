// v3 amenity catalog.
//
// Two shapes are exported:
//  - AMENITY_PANELS: the v3 priority-ordered panels (each with subcategories),
//    which is what the consumer filter panel renders.
//  - AMENITY_CATEGORIES: the flat subcategory list, kept for the admin/owner
//    pickers and the AI enrichment code that already consume it.
//
// Every slug below is unchanged from the previous catalog, so existing
// VenueAmenity records keep matching. `is_quick_filter` marks the high-intent
// amenities surfaced as one-tap chips on Explore.

const SUBCATEGORIES = [
  {
    id: 'deal_type',
    label: 'Deal type',
    amenities: [
      { slug: 'half_price_drinks', label: 'Half-price drinks', is_quick_filter: true },
      { slug: 'dollar_drinks', label: '$X drinks' },
      { slug: 'bogo', label: 'BOGO' },
      { slug: 'drink_food_combo', label: 'Drink + food combo' },
      { slug: 'happy_hour_menu', label: 'Happy hour menu' },
      { slug: 'reverse_happy_hour', label: 'Reverse happy hour' },
    ],
  },
  {
    id: 'bar_style',
    label: 'Bar style',
    amenities: [
      { slug: 'cocktail_bar', label: 'Cocktail bar' },
      { slug: 'dive_bar', label: 'Dive bar' },
      { slug: 'sports_bar', label: 'Sports bar' },
      { slug: 'wine_bar', label: 'Wine bar' },
      { slug: 'taproom', label: 'Taproom' },
      { slug: 'brewery', label: 'Brewery' },
      { slug: 'lounge', label: 'Lounge' },
      { slug: 'speakeasy', label: 'Speakeasy' },
    ],
  },
  {
    id: 'energy',
    label: 'Energy',
    amenities: [
      { slug: 'lively', label: 'Lively' },
      { slug: 'buzzy', label: 'Buzzy' },
      { slug: 'chill', label: 'Chill' },
      { slug: 'quiet', label: 'Quiet' },
      { slug: 'low_key', label: 'Low-key' },
    ],
  },
  {
    id: 'vibe',
    label: 'Vibe',
    amenities: [
      { slug: 'upscale', label: 'Upscale' },
      { slug: 'casual', label: 'Casual' },
      { slug: 'cozy', label: 'Cozy' },
      { slug: 'trendy', label: 'Trendy' },
      { slug: 'divey', label: 'Dive-y' },
      { slug: 'classic', label: 'Classic' },
      { slug: 'dark_moody', label: 'Dark & moody' },
    ],
  },
  {
    id: 'setting',
    label: 'Setting',
    amenities: [
      { slug: 'outdoor_patio', label: 'Outdoor patio', is_quick_filter: true },
      { slug: 'covered_patio', label: 'Covered patio' },
      { slug: 'rooftop', label: 'Rooftop', is_quick_filter: true },
      { slug: 'waterfront', label: 'Waterfront' },
      { slug: 'garden_courtyard', label: 'Garden / courtyard' },
      { slug: 'city_view', label: 'City view' },
      { slug: 'sunset_view', label: 'Sunset view' },
      { slug: 'fireplace', label: 'Fireplace' },
      { slug: 'fire_pit', label: 'Fire pit' },
      { slug: 'hotel_bar', label: 'Hotel bar' },
      { slug: 'live_music_venue', label: 'Live music venue' },
      { slug: 'private_members', label: 'Private / members' },
    ],
  },
  {
    id: 'seating_type',
    label: 'Seating type',
    amenities: [
      { slug: 'bar_seating', label: 'Bar seating' },
      { slug: 'booths', label: 'Booths' },
      { slug: 'high_top_tables', label: 'High-top tables' },
      { slug: 'lounge_seating', label: 'Lounge seating' },
      { slug: 'communal_tables', label: 'Communal tables' },
      { slug: 'private_room', label: 'Private room' },
      { slug: 'semi_private_area', label: 'Semi-private area' },
    ],
  },
  {
    id: 'live_entertainment',
    label: 'Live entertainment',
    amenities: [
      { slug: 'live_music', label: 'Live music', is_quick_filter: true },
      { slug: 'dj', label: 'DJ' },
      { slug: 'comedy', label: 'Comedy' },
      { slug: 'open_mic', label: 'Open mic' },
      { slug: 'karaoke', label: 'Karaoke', is_quick_filter: true },
      { slug: 'dance_floor', label: 'Dance floor' },
      { slug: 'themed_nights', label: 'Themed nights' },
    ],
  },
  {
    id: 'games_activities',
    label: 'Games & activities',
    amenities: [
      { slug: 'trivia', label: 'Trivia', is_quick_filter: true },
      { slug: 'bingo', label: 'Bingo' },
      { slug: 'pool_table', label: 'Pool table' },
      { slug: 'darts', label: 'Darts' },
      { slug: 'shuffleboard', label: 'Shuffleboard' },
      { slug: 'arcade_games', label: 'Arcade games' },
      { slug: 'board_games', label: 'Board games' },
      { slug: 'cornhole_yard_games', label: 'Cornhole / yard games' },
      { slug: 'ping_pong', label: 'Ping pong' },
    ],
  },
  {
    id: 'screens_sports',
    label: 'Screens & sports',
    amenities: [
      { slug: 'sports_on_tv', label: 'Sports on TV', is_quick_filter: true },
      { slug: 'big_screen_tvs', label: 'Big-screen TVs' },
      { slug: 'watch_party_friendly', label: 'Watch-party friendly' },
      { slug: 'projector_big_screen', label: 'Projector / big screen' },
    ],
  },
  {
    id: 'parking_transit',
    label: 'Parking & transit',
    amenities: [
      { slug: 'free_parking', label: 'Free parking', is_quick_filter: true },
      { slug: 'valet_parking', label: 'Valet parking' },
      { slug: 'street_parking', label: 'Street parking' },
      { slug: 'garage_nearby', label: 'Garage nearby' },
      { slug: 'near_transit', label: 'Near transit' },
      { slug: 'bike_friendly', label: 'Bike-friendly' },
    ],
  },
  {
    id: 'location',
    label: 'Location',
    amenities: [
      { slug: 'downtown', label: 'Downtown' },
      { slug: 'near_stadium', label: 'Near stadium' },
      { slug: 'near_event_venue', label: 'Near event venue' },
      { slug: 'neighborhood_spot', label: 'Neighborhood spot' },
    ],
  },
  {
    id: 'service',
    label: 'Service',
    amenities: [
      { slug: 'reservations_accepted', label: 'Reservations accepted' },
      { slug: 'walk_ins_welcome', label: 'Walk-ins welcome' },
      { slug: 'fast_service', label: 'Fast service' },
      { slug: 'large_groups_ok', label: 'Large groups OK' },
      { slug: 'no_cover_charge', label: 'No cover charge' },
    ],
  },
  {
    id: 'availability',
    label: 'Availability',
    amenities: [
      { slug: 'first_come_first_served', label: 'First come, first served' },
      { slug: 'reservations_available', label: 'Reservations available' },
      { slug: 'walk_in_only', label: 'Walk-in only' },
    ],
  },
  {
    id: 'amenities',
    label: 'Amenities',
    amenities: [
      { slug: 'free_wifi', label: 'Free Wi-Fi' },
      { slug: 'charging_outlets', label: 'Charging outlets' },
      { slug: 'ada_accessible', label: 'ADA accessible' },
      { slug: 'gender_neutral_restrooms', label: 'Gender-neutral restrooms' },
      { slug: 'coat_check', label: 'Coat check' },
    ],
  },
  {
    id: 'physical_access',
    label: 'Physical access',
    amenities: [
      { slug: 'wheelchair_accessible', label: 'Wheelchair accessible', is_quick_filter: true },
      { slug: 'step_free_entry', label: 'Step-free entry' },
      { slug: 'elevator_access', label: 'Elevator access' },
      { slug: 'accessible_restrooms', label: 'Accessible restrooms' },
      { slug: 'accessible_parking', label: 'Accessible parking' },
      { slug: 'wide_doorways_aisles', label: 'Wide doorways & aisles' },
    ],
  },
  {
    id: 'sensory',
    label: 'Sensory',
    amenities: [
      { slug: 'quieter_environment', label: 'Quieter environment' },
      { slug: 'well_lit_interior', label: 'Well-lit interior' },
      { slug: 'hearing_loop', label: 'Hearing loop' },
      { slug: 'low_stimulation_area', label: 'Low-stimulation area available' },
    ],
  },
  {
    id: 'accessibility_service',
    label: 'Accessibility service',
    amenities: [
      { slug: 'service_animals_welcome', label: 'Service animals welcome' },
      { slug: 'accessible_menu', label: 'Accessible menu available' },
      { slug: 'braille_large_print_menu', label: 'Braille / large print menu' },
      { slug: 'staff_accessibility_training', label: 'Staff accessibility training' },
    ],
  },
  {
    id: 'drinks',
    label: 'Drinks',
    amenities: [
      { slug: 'cocktails', label: 'Cocktails', is_quick_filter: true },
      { slug: 'beer_draft', label: 'Beer & draft' },
      { slug: 'wine', label: 'Wine', is_quick_filter: true },
      { slug: 'well_drinks', label: 'Well drinks' },
      { slug: 'margaritas', label: 'Margaritas' },
      { slug: 'martinis', label: 'Martinis' },
    ],
  },
  {
    id: 'drink_options',
    label: 'Drink options',
    amenities: [
      { slug: 'non_alcoholic_options', label: 'Non-alcoholic options', is_quick_filter: true },
      { slug: 'mocktail_menu', label: 'Mocktail menu' },
      { slug: 'low_abv_options', label: 'Low-ABV options' },
      { slug: 'natural_wine', label: 'Natural wine' },
      { slug: 'craft_beer', label: 'Craft beer', is_quick_filter: true },
      { slug: 'local_spirits', label: 'Local spirits' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    amenities: [
      { slug: 'small_plates', label: 'Small plates' },
      { slug: 'wings', label: 'Wings' },
      { slug: 'burgers', label: 'Burgers' },
      { slug: 'pizza', label: 'Pizza' },
      { slug: 'tacos', label: 'Tacos' },
      { slug: 'sushi', label: 'Sushi' },
      { slug: 'desserts', label: 'Desserts' },
    ],
  },
  {
    id: 'food_focus',
    label: 'Food focus',
    amenities: [
      { slug: 'restaurant', label: 'Restaurant' },
      { slug: 'gastropub', label: 'Gastropub' },
      { slug: 'bar_bites_only', label: 'Bar bites only' },
      { slug: 'food_hall', label: 'Food hall' },
    ],
  },
  {
    id: 'dietary_needs',
    label: 'Dietary needs',
    amenities: [
      { slug: 'vegetarian', label: 'Vegetarian' },
      { slug: 'vegan', label: 'Vegan' },
      { slug: 'gluten_free', label: 'Gluten-free' },
      { slug: 'dairy_free', label: 'Dairy-free' },
      { slug: 'nut_free', label: 'Nut-free' },
      { slug: 'keto_friendly', label: 'Keto-friendly' },
      { slug: 'halal', label: 'Halal' },
      { slug: 'kosher', label: 'Kosher' },
    ],
  },
  {
    id: 'menu_format',
    label: 'Menu format',
    amenities: [
      { slug: 'full_kitchen', label: 'Full kitchen' },
      { slug: 'bar_bites_menu', label: 'Bar bites only' },
      { slug: 'happy_hour_food_menu', label: 'Happy hour food menu' },
      { slug: 'late_night_menu', label: 'Late-night menu' },
      { slug: 'prix_fixe', label: 'Prix fixe' },
      { slug: 'allergen_aware_kitchen', label: 'Allergen-aware kitchen' },
    ],
  },
  {
    id: 'good_for',
    label: 'Good for',
    amenities: [
      { slug: 'date_night', label: 'Date night' },
      { slug: 'after_work', label: 'After work' },
      { slug: 'groups', label: 'Groups' },
      { slug: 'solo', label: 'Solo' },
      { slug: 'dog_friendly', label: 'Dog-friendly', is_quick_filter: true },
      { slug: 'sports_watching', label: 'Sports watching' },
    ],
  },
];

const byId = Object.fromEntries(SUBCATEGORIES.map(s => [s.id, s]));
const pick = (...ids) => ids.map(id => byId[id]).filter(Boolean);

// v3 panel priority order. Venue Type, Deals, Time and Cuisine also have
// non-amenity sources (catalog entities / derived schedule data) handled in the
// filter panel component — the amenity subcategories here complement them.
export const AMENITY_PANELS = [
  { id: 'deals', label: 'Deals', subcategories: pick('deal_type') },
  { id: 'atmosphere', label: 'Atmosphere', subcategories: pick('bar_style', 'energy', 'vibe') },
  { id: 'seating_setting', label: 'Seating & Setting', subcategories: pick('setting', 'seating_type') },
  { id: 'entertainment', label: 'Entertainment', subcategories: pick('live_entertainment', 'games_activities', 'screens_sports') },
  { id: 'convenience', label: 'Convenience', subcategories: pick('parking_transit', 'location', 'service', 'availability', 'amenities') },
  { id: 'accessibility', label: 'Accessibility', subcategories: pick('physical_access', 'sensory', 'accessibility_service') },
  { id: 'menu_cuisine', label: 'Menu & Cuisine', subcategories: pick('drinks', 'drink_options', 'food', 'food_focus', 'dietary_needs', 'menu_format') },
  { id: 'occasion', label: 'Occasion', subcategories: pick('good_for') },
];

// Flat subcategory list — kept for the admin/owner amenity pickers.
export const AMENITY_CATEGORIES = SUBCATEGORIES;

export const ALL_AMENITIES = SUBCATEGORIES.flatMap(c => c.amenities);

export const QUICK_FILTER_AMENITIES = ALL_AMENITIES.filter(a => a.is_quick_filter);