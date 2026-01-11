function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function buildPreventions(input: { risk: number; level: string; primaryThreat: string }): string[] {
  const risk = clamp01(input.risk)
  const level = input.level
  const threat = (input.primaryThreat || 'Unknown').toLowerCase()

  const intensity = risk > 0.7 || level === 'High' || level === 'Critical'

  if (threat.includes('water')) {
    return [
      'Drink only boiled/filtered water; avoid untreated water sources.',
      'Wash hands with soap regularly, especially before eating and after toilet use.',
      'Avoid raw/unsafe street food; eat freshly cooked hot meals.',
      intensity
        ? 'Keep ORS ready and seek medical care quickly for diarrhea/dehydration symptoms.'
        : 'Keep ORS available and monitor symptoms early.',
      'Ensure safe sanitation and disinfect high-touch surfaces at home.',
    ]
  }

  if (threat.includes('resp')) {
    return [
      'Improve ventilation indoors; avoid crowded poorly ventilated places.',
      'Wear a mask in crowded indoor areas if you have symptoms or risk is elevated.',
      'Practice hand hygiene and avoid touching face after public contact.',
      intensity
        ? 'If fever/breathing issues occur, seek medical care promptly and isolate.'
        : 'If fever/cough persists, seek medical advice and rest.',
      'Keep children and seniors up to date with recommended vaccines where available.',
    ]
  }

  // Default to vector-borne style guidance.
  return [
    'Use mosquito repellent and wear long sleeves in the evening/night.',
    'Remove standing water (coolers, pots, buckets) to reduce mosquito breeding.',
    'Use bed nets/screens; keep doors/windows closed when possible.',
    intensity
      ? 'Seek medical care quickly for high fever, rash, or severe body aches.'
      : 'Monitor symptoms and get tested early if fever develops.',
    'Maintain clean surroundings and coordinate community vector control where possible.',
  ]
}
