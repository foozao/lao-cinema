/**
 * Crew job title translation utilities
 * Maps common crew job titles to translation keys
 */

export function getCrewJobKey(jobTitle: string): string {
  const normalized = jobTitle.toLowerCase().trim();
  
  const jobMap: Record<string, string> = {
    'director': 'crew.director',
    'writer': 'crew.writer',
    'screenplay': 'crew.screenplay',
    'producer': 'crew.producer',
    'executive producer': 'crew.executiveProducer',
    'director of photography': 'crew.cinematography',
    'cinematography': 'crew.cinematography',
    'editor': 'crew.editor',
    'music': 'crew.music',
    'original music composer': 'crew.music',
    'production design': 'crew.productionDesign',
    'art direction': 'crew.artDirection',
    'set decoration': 'crew.setDecoration',
    'costume design': 'crew.costumeDesign',
  };
  
  return jobMap[normalized] || jobTitle;
}

export function getDepartmentKey(department: string): string {
  const normalized = department.toLowerCase().trim();
  
  const deptMap: Record<string, string> = {
    'directing': 'departments.directing',
    'writing': 'departments.writing',
    'production': 'departments.production',
    'camera': 'departments.camera',
    'editing': 'departments.editing',
    'sound': 'departments.sound',
    'art': 'departments.art',
    'costume & make-up': 'departments.costumeAndMakeup',
    'visual effects': 'departments.visualEffects',
  };
  
  return deptMap[normalized] || department;
}
