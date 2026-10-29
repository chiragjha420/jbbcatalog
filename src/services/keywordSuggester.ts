/**
 * Keyword & Alias Suggester for Billiards, Snooker, Pool & Furniture Products
 */

// Common dimension & specification expansions
const MEASUREMENT_MAP: Record<string, string[]> = {
  '12ft': ['12 ft', '12 feet', '12-foot', "12'"],
  '12': ['12ft', '12 ft', '12 feet'],
  '10ft': ['10 ft', '10 feet', '10-foot', "10'"],
  '10': ['10ft', '10 ft', '10 feet'],
  '9ft': ['9 ft', '9 feet', '9-foot', "9'"],
  '9': ['9ft', '9 ft', '9 feet'],
  '8ft': ['8 ft', '8 feet', '8-foot', "8'"],
  '8': ['8ft', '8 ft', '8 feet'],
  '7ft': ['7 ft', '7 feet', '7-foot', "7'"],
  '7': ['7ft', '7 ft', '7 feet'],
  '6ft': ['6 ft', '6 feet', '6-foot', "6'"],
  '6': ['6ft', '6 ft', '6 feet'],
};

// Domain synonyms for billiard and game room products
const SYNONYM_MAP: Record<string, string[]> = {
  snooker: ['snooker table', 'billiards', 'billiards table', 'cue sport', 'english billiards'],
  pool: ['pool table', '8 ball', '9 ball', 'american pool', 'billiards'],
  billiards: ['billiard table', 'snooker', 'pool', 'cue sports'],
  cue: ['cue stick', 'cue sticks', 'stick', 'billiard cue', 'snooker cue', 'pool cue'],
  table: ['wooden table', 'tournament table', 'slate table', 'board'],
  slate: ['italian slate', 'slate bed', 'marble', 'stone'],
  cloth: ['felt', 'baize', 'speed cloth', 'wool cloth', 'strachan'],
  ball: ['balls', 'snooker balls', 'pool balls', 'aramith', 'cue ball'],
  balls: ['ball', 'snooker balls', 'pool balls', 'aramith', 'cue ball'],
  case: ['cue case', 'cue box', 'hard case', 'leather case', 'cue bag'],
  glove: ['gloves', 'billiard glove', 'hand glove', 'left hand glove', '3 finger glove'],
  gloves: ['glove', 'billiard glove', 'hand glove', 'left hand glove'],
  chalk: ['cue chalk', 'blue chalk', 'triangle chalk', 'taom', 'master chalk'],
  tip: ['cue tip', 'tips', 'leather tip', 'kamui', 'pressed tip'],
  tips: ['cue tip', 'tip', 'leather tip', 'kamui'],
  rest: ['rest stick', 'bridge', 'spider', 'cross rest', 'swan rest'],
  triangle: ['rack', 'ball rack', 'diamond rack', 'triangle rack'],
  lamp: ['lights', 'canopy lamp', 'table lamp', 'shade lights', 'led lighting'],
  pocket: ['leather pockets', 'brass pocket', 'pocket net', 'rail'],
  royal: ['royal table', 'luxury table', 'deluxe', 'premium', 'classic'],
  tournament: ['professional table', 'match table', 'competition table'],
};

/**
 * Automatically suggests keywords based on product name and optional category
 */
export function suggestKeywords(name: string, categoryName?: string): string[] {
  if (!name.trim()) return [];

  const suggestions = new Set<string>();
  const cleanName = name.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const tokens = cleanName.split(/\s+/).filter(t => t.length > 1);

  // Add individual meaningful tokens
  for (const token of tokens) {
    if (!['the', 'and', 'for', 'with', 'model'].includes(token)) {
      suggestions.add(token);
    }
  }

  // Look for dimensions (e.g. "12 ft", "12ft", "10ft")
  const fullText = cleanName.toLowerCase();
  for (const [key, expansions] of Object.entries(MEASUREMENT_MAP)) {
    if (fullText.includes(key) || tokens.includes(key)) {
      expansions.forEach(exp => suggestions.add(exp));
    }
  }

  // Look for synonyms
  for (const token of tokens) {
    if (SYNONYM_MAP[token]) {
      SYNONYM_MAP[token].forEach(syn => suggestions.add(syn));
    }
  }

  // Add category terms if provided
  if (categoryName) {
    const catClean = categoryName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    catClean.split(/\s+/).filter(t => t.length > 2).forEach(t => suggestions.add(t));
    suggestions.add(categoryName.toLowerCase());
  }

  return Array.from(suggestions).slice(0, 15);
}

/**
 * Generate search aliases for indexation (synonyms, number-word equivalents)
 */
export function generateAliases(name: string, keywords: string[]): string {
  const aliasSet = new Set<string>();
  const combined = `${name} ${keywords.join(' ')}`.toLowerCase();

  // Dimension conversions
  if (combined.includes('12ft') || combined.includes('12 ft') || combined.includes('12 feet')) {
    aliasSet.add('12ft');
    aliasSet.add('12 ft');
    aliasSet.add('12 feet');
    aliasSet.add("12'");
    aliasSet.add('twelve foot');
  }
  if (combined.includes('10ft') || combined.includes('10 ft') || combined.includes('10 feet')) {
    aliasSet.add('10ft');
    aliasSet.add('10 ft');
    aliasSet.add('10 feet');
    aliasSet.add("10'");
    aliasSet.add('ten foot');
  }
  if (combined.includes('9ft') || combined.includes('9 ft') || combined.includes('9 feet')) {
    aliasSet.add('9ft');
    aliasSet.add('9 ft');
    aliasSet.add('9 feet');
    aliasSet.add("9'");
    aliasSet.add('nine foot');
  }
  if (combined.includes('8ft') || combined.includes('8 ft') || combined.includes('8 feet')) {
    aliasSet.add('8ft');
    aliasSet.add('8 ft');
    aliasSet.add('8 feet');
    aliasSet.add("8'");
    aliasSet.add('eight foot');
  }

  // Snooker / Pool / Billiards interchangeable aliases
  if (combined.includes('snooker')) {
    aliasSet.add('billiards');
    aliasSet.add('cue sport');
  }
  if (combined.includes('pool')) {
    aliasSet.add('billiards');
    aliasSet.add('8 ball');
  }
  if (combined.includes('cue')) {
    aliasSet.add('stick');
    aliasSet.add('rod');
  }

  return Array.from(aliasSet).join(', ');
}
