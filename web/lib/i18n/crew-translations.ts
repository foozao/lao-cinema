/**
 * Crew job title translations
 * Maps English TMDB job titles to translation keys
 */

export const crewJobTranslations: Record<string, string> = {
  // Directing
  'Director': 'crew.director',
  
  // Writing
  'Writer': 'crew.writer',
  'Screenplay': 'crew.screenplay',
  'Story': 'crew.writer',
  'Novel': 'crew.writer',
  'Author': 'crew.writer',
  'Book': 'crew.writer',
  
  // Production
  'Producer': 'crew.producer',
  'Executive Producer': 'crew.executiveProducer',
  'Co-Producer': 'crew.producer',
  'Associate Producer': 'crew.producer',
  'Line Producer': 'crew.producer',
  
  // Camera
  'Director of Photography': 'crew.cinematography',
  'Cinematography': 'crew.cinematography',
  'Camera Operator': 'crew.cinematography',
  
  // Editing
  'Editor': 'crew.editor',
  'Film Editor': 'crew.editor',
  'Film Editing': 'crew.editor',
  
  // Music
  'Music': 'crew.music',
  'Original Music Composer': 'crew.music',
  'Music Director': 'crew.music',
  'Composer': 'crew.music',
  
  // Art
  'Production Design': 'crew.productionDesign',
  'Production Designer': 'crew.productionDesign',
  'Art Direction': 'crew.artDirection',
  'Art Designer': 'crew.artDirection',
  'Set Decoration': 'crew.setDecoration',
  'Set Decorator': 'crew.setDecoration',
  
  // Costume
  'Costume Design': 'crew.costumeDesign',
  'Costume Designer': 'crew.costumeDesign',
};

/**
 * Get translation key for a crew job title
 * Returns the job title itself if no translation key exists
 */
export function getCrewJobTranslationKey(job: string): string | null {
  return crewJobTranslations[job] || null;
}
