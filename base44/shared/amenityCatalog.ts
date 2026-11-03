// Server-side mirror of the amenity catalog in src/lib/amenities.js.
// `base44/` is server-side and cannot import from `src/`, so the slug list is
// duplicated here. If you add/remove a slug in src/lib/amenities.js, update this
// file in the same change — the research pass validates LLM output against it,
// so a slug missing here will be silently dropped.

export const AMENITY_CATALOG = [
  { id: 'deal_type', label: 'Deal type', amenities: [
    ['half_price_drinks', 'Half-price drinks'], ['dollar_drinks', '$X drinks'], ['bogo', 'BOGO'],
    ['drink_food_combo', 'Drink + food combo'], ['happy_hour_menu', 'Happy hour menu'],
    ['reverse_happy_hour', 'Reverse happy hour'],
  ]},
  { id: 'drinks', label: 'Drinks', amenities: [
    ['cocktails', 'Cocktails'], ['beer_draft', 'Beer & draft'], ['wine', 'Wine'],
    ['well_drinks', 'Well drinks'], ['margaritas', 'Margaritas'], ['martinis', 'Martinis'],
  ]},
  { id: 'food', label: 'Food', amenities: [
    ['small_plates', 'Small plates'], ['wings', 'Wings'], ['burgers', 'Burgers'], ['pizza', 'Pizza'],
    ['tacos', 'Tacos'], ['sushi', 'Sushi'], ['desserts', 'Desserts'],
  ]},
  { id: 'bar_style', label: 'Bar style', amenities: [
    ['cocktail_bar', 'Cocktail bar'], ['dive_bar', 'Dive bar'], ['sports_bar', 'Sports bar'],
    ['wine_bar', 'Wine bar'], ['taproom', 'Taproom'], ['brewery', 'Brewery'], ['lounge', 'Lounge'],
    ['speakeasy', 'Speakeasy'],
  ]},
  { id: 'food_focus', label: 'Food focus', amenities: [
    ['restaurant', 'Restaurant'], ['gastropub', 'Gastropub'], ['bar_bites_only', 'Bar bites only'],
    ['food_hall', 'Food hall'],
  ]},
  { id: 'setting', label: 'Setting', amenities: [
    ['outdoor_patio', 'Outdoor patio'], ['covered_patio', 'Covered patio'], ['rooftop', 'Rooftop'],
    ['waterfront', 'Waterfront'], ['garden_courtyard', 'Garden / courtyard'], ['city_view', 'City view'],
    ['sunset_view', 'Sunset view'], ['fireplace', 'Fireplace'], ['fire_pit', 'Fire pit'],
    ['hotel_bar', 'Hotel bar'], ['live_music_venue', 'Live music venue'], ['private_members', 'Private / members'],
  ]},
  { id: 'energy', label: 'Energy', amenities: [
    ['lively', 'Lively'], ['buzzy', 'Buzzy'], ['chill', 'Chill'], ['quiet', 'Quiet'], ['low_key', 'Low-key'],
  ]},
  { id: 'vibe', label: 'Vibe', amenities: [
    ['upscale', 'Upscale'], ['casual', 'Casual'], ['cozy', 'Cozy'], ['trendy', 'Trendy'],
    ['divey', 'Dive-y'], ['classic', 'Classic'], ['dark_moody', 'Dark & moody'],
  ]},
  { id: 'good_for', label: 'Good for', amenities: [
    ['date_night', 'Date night'], ['after_work', 'After work'], ['groups', 'Groups'], ['solo', 'Solo'],
    ['dog_friendly', 'Dog-friendly'], ['sports_watching', 'Sports watching'],
  ]},
  { id: 'seating_type', label: 'Seating type', amenities: [
    ['bar_seating', 'Bar seating'], ['booths', 'Booths'], ['high_top_tables', 'High-top tables'],
    ['lounge_seating', 'Lounge seating'], ['communal_tables', 'Communal tables'],
    ['private_room', 'Private room'], ['semi_private_area', 'Semi-private area'],
  ]},
  { id: 'availability', label: 'Availability', amenities: [
    ['first_come_first_served', 'First come, first served'], ['reservations_available', 'Reservations available'],
    ['walk_in_only', 'Walk-in only'],
  ]},
  { id: 'live_entertainment', label: 'Live entertainment', amenities: [
    ['live_music', 'Live music'], ['dj', 'DJ'], ['comedy', 'Comedy'], ['open_mic', 'Open mic'],
    ['karaoke', 'Karaoke'], ['dance_floor', 'Dance floor'], ['themed_nights', 'Themed nights'],
  ]},
  { id: 'games_activities', label: 'Games & activities', amenities: [
    ['trivia', 'Trivia'], ['bingo', 'Bingo'], ['pool_table', 'Pool table'], ['darts', 'Darts'],
    ['shuffleboard', 'Shuffleboard'], ['arcade_games', 'Arcade games'], ['board_games', 'Board games'],
    ['cornhole_yard_games', 'Cornhole / yard games'], ['ping_pong', 'Ping pong'],
  ]},
  { id: 'screens_sports', label: 'Screens & sports', amenities: [
    ['sports_on_tv', 'Sports on TV'], ['big_screen_tvs', 'Big-screen TVs'],
    ['watch_party_friendly', 'Watch-party friendly'], ['projector_big_screen', 'Projector / big screen'],
  ]},
  { id: 'parking_transit', label: 'Parking & transit', amenities: [
    ['free_parking', 'Free parking'], ['valet_parking', 'Valet parking'], ['street_parking', 'Street parking'],
    ['garage_nearby', 'Garage nearby'], ['near_transit', 'Near transit'], ['bike_friendly', 'Bike-friendly'],
  ]},
  { id: 'location', label: 'Location', amenities: [
    ['downtown', 'Downtown'], ['near_stadium', 'Near stadium'], ['near_event_venue', 'Near event venue'],
    ['neighborhood_spot', 'Neighborhood spot'],
  ]},
  { id: 'service', label: 'Service', amenities: [
    ['reservations_accepted', 'Reservations accepted'], ['walk_ins_welcome', 'Walk-ins welcome'],
    ['fast_service', 'Fast service'], ['large_groups_ok', 'Large groups OK'], ['no_cover_charge', 'No cover charge'],
  ]},
  { id: 'amenities', label: 'Amenities', amenities: [
    ['free_wifi', 'Free Wi-Fi'], ['charging_outlets', 'Charging outlets'], ['ada_accessible', 'ADA accessible'],
    ['gender_neutral_restrooms', 'Gender-neutral restrooms'], ['coat_check', 'Coat check'],
  ]},
  { id: 'physical_access', label: 'Physical access', amenities: [
    ['wheelchair_accessible', 'Wheelchair accessible'], ['step_free_entry', 'Step-free entry'],
    ['elevator_access', 'Elevator access'], ['accessible_restrooms', 'Accessible restrooms'],
    ['accessible_parking', 'Accessible parking'], ['wide_doorways_aisles', 'Wide doorways & aisles'],
  ]},
  { id: 'sensory', label: 'Sensory', amenities: [
    ['quieter_environment', 'Quieter environment'], ['well_lit_interior', 'Well-lit interior'],
    ['hearing_loop', 'Hearing loop'], ['low_stimulation_area', 'Low-stimulation area available'],
  ]},
  { id: 'accessibility_service', label: 'Accessibility service', amenities: [
    ['service_animals_welcome', 'Service animals welcome'], ['accessible_menu', 'Accessible menu available'],
    ['braille_large_print_menu', 'Braille / large print menu'],
    ['staff_accessibility_training', 'Staff accessibility training'],
  ]},
  { id: 'dietary_needs', label: 'Dietary needs', amenities: [
    ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['gluten_free', 'Gluten-free'],
    ['dairy_free', 'Dairy-free'], ['nut_free', 'Nut-free'], ['keto_friendly', 'Keto-friendly'],
    ['halal', 'Halal'], ['kosher', 'Kosher'],
  ]},
  { id: 'drink_options', label: 'Drink options', amenities: [
    ['non_alcoholic_options', 'Non-alcoholic options'], ['mocktail_menu', 'Mocktail menu'],
    ['low_abv_options', 'Low-ABV options'], ['natural_wine', 'Natural wine'], ['craft_beer', 'Craft beer'],
    ['local_spirits', 'Local spirits'],
  ]},
  { id: 'menu_format', label: 'Menu format', amenities: [
    ['full_kitchen', 'Full kitchen'], ['bar_bites_menu', 'Bar bites only'],
    ['happy_hour_food_menu', 'Happy hour food menu'], ['late_night_menu', 'Late-night menu'],
    ['prix_fixe', 'Prix fixe'], ['allergen_aware_kitchen', 'Allergen-aware kitchen'],
  ]},
];

// Every valid slug, for validating LLM output.
export const VALID_AMENITY_SLUGS = new Set(
  AMENITY_CATALOG.flatMap((c) => c.amenities.map(([slug]) => slug))
);

export const AMENITY_CATEGORY_IDS = AMENITY_CATALOG.map((c) => c.id);

// Human-readable catalog rendered into the research prompt so the model can only
// pick slugs that actually exist in the app.
export function renderAmenityCatalogForPrompt() {
  return AMENITY_CATALOG.map(
    (c) => `${c.label} (category id: ${c.id})\n${c.amenities.map(([slug, label]) => `  ${slug} = ${label}`).join('\n')}`
  ).join('\n\n');
}

export function slugifyAmenityLabel(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}