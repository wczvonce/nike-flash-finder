/**
 * Team Name Normalizer
 * Handles diacritics removal, abbreviation normalization, and alias matching
 */

const ALIASES: Record<string, string[]> = {
  'borussia monchengladbach': ['m gladbach', 'gladbach', 'bmg', "b. m'gladbach"],
  'newcastle united': ['newcastle utd', 'newcastle'],
  'sparta praha': ['hc sparta praha', 'ac sparta praha', 'sparta prague'],
  'spisska nova ves': ['spisska n. ves', 'spisska n ves'],
  'manchester united': ['man utd', 'man united', 'manchester utd'],
  'manchester city': ['man city'],
  'atletico madrid': ['atl. madrid', 'atl madrid', 'atletico'],
  'bayern munich': ['bayern munchen', 'bayern', 'fc bayern'],
  'paris saint-germain': ['psg', 'paris sg', 'paris saint germain'],
  'real madrid': ['r. madrid'],
  'barcelona': ['fc barcelona', 'barca'],
  'slovan bratislava': ['sk slovan bratislava'],
  'zilina': ['msk zilina'],
  'kosice': ['fc kosice'],
  'banska bystrica': ['fk dukla banska bystrica', 'dukla b. bystrica'],
  'trencin': ['as trencin', 'fk as trencin'],
};

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeBase(name: string): string {
  return removeDiacritics(name)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTeamName(name: string): string {
  const base = normalizeBase(name);

  // Check aliases
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (base === normalizeBase(canonical)) return canonical;
    for (const alias of aliases) {
      if (base === normalizeBase(alias)) return canonical;
    }
  }

  return base;
}

export function computeMatchConfidence(
  nikeHome: string,
  nikeAway: string,
  fsHome: string,
  fsAway: string,
  nikeSport: string,
  fsSport: string,
  nikeDate: string,
  fsDate: string,
  nikeTime: string,
  fsTime: string
): number {
  let score = 0;

  const nH = normalizeTeamName(nikeHome);
  const nA = normalizeTeamName(nikeAway);
  const fH = normalizeTeamName(fsHome);
  const fA = normalizeTeamName(fsAway);

  // Exact home+away match
  if (nH === fH && nA === fA) score += 50;
  // Partial fuzzy
  else if (nH.includes(fH) || fH.includes(nH)) score += 20;
  if (nA === fA) score += 20;
  else if (nA.includes(fA) || fA.includes(nA)) score += 10;

  // Same sport
  if (nikeSport === fsSport) score += 15;

  // Same date
  if (nikeDate === fsDate) score += 10;

  // Close time
  if (nikeTime && fsTime) {
    const diff = Math.abs(parseTimeMinutes(nikeTime) - parseTimeMinutes(fsTime));
    if (diff <= 5) score += 5;
    else if (diff <= 30) score += 2;
  }

  return Math.min(score, 100);
}

function parseTimeMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const MATCH_CONFIDENCE_THRESHOLD = 60;
