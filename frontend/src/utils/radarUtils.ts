export const getPhysicsCategory = (chapter: string): string => {
  const ch = chapter.toLowerCase();
  if (ch.includes('kinematics') || ch.includes('motion') || ch.includes('work') || ch.includes('rotational') || ch.includes('gravitation') || ch.includes('mechanics')) {
    return 'Mechanics';
  }
  if (ch.includes('thermo') || ch.includes('heat') || ch.includes('ktg') || ch.includes('kinetic theory')) {
    return 'Thermodynamics';
  }
  if (ch.includes('electro') || ch.includes('electricity') || ch.includes('magnet') || ch.includes('current')) {
    return 'Electrodynamics';
  }
  if (ch.includes('optics') || ch.includes('ray') || ch.includes('wave')) {
    return 'Optics';
  }
  return 'Modern Physics';
};

export const getChemistryCategory = (chapter: string): string => {
  const ch = chapter.toLowerCase();
  if (ch.includes('organic') || ch.includes('hydrocarbon') || ch.includes('haloalkane') || ch.includes('alcohol') || ch.includes('aldehyde') || ch.includes('amine') || ch.includes('ether')) {
    return 'Organic Chemistry';
  }
  if (ch.includes('inorganic') || ch.includes('bonding') || ch.includes('p-block') || ch.includes('d-block') || ch.includes('coordination') || ch.includes('periodic') || ch.includes('metallurgy') || ch.includes('block')) {
    return 'Inorganic Chemistry';
  }
  return 'Physical Chemistry';
};

export const getBiologyCategory = (chapter: string): string => {
  const ch = chapter.toLowerCase();
  if (ch.includes('cell') || ch.includes('biomolecule') || ch.includes('division')) {
    return 'Cell Biology';
  }
  if (ch.includes('genetics') || ch.includes('inheritance') || ch.includes('evolution') || ch.includes('molecular basis')) {
    return 'Genetics';
  }
  if (ch.includes('human') || ch.includes('digestion') || ch.includes('breathing') || ch.includes('circulation') || ch.includes('excretion') || ch.includes('locomotion') || ch.includes('neural') || ch.includes('chemical coordination') || ch.includes('physiology')) {
    return 'Human Physiology';
  }
  if (ch.includes('plant') || ch.includes('photosynthesis') || ch.includes('respiration in plants') || ch.includes('transport in plants') || ch.includes('mineral nutrition') || ch.includes('growth')) {
    return 'Plant Physiology';
  }
  return 'Ecology';
};

export const getCategory = (chapter: string, subject: string): string => {
  if (subject === 'Physics') return getPhysicsCategory(chapter);
  if (subject === 'Chemistry') return getChemistryCategory(chapter);
  return getBiologyCategory(chapter);
};

export const SUBJECT_CATEGORIES: Record<string, string[]> = {
  Physics: ['Mechanics', 'Thermodynamics', 'Electrodynamics', 'Optics', 'Modern Physics'],
  Chemistry: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'],
  Biology: ['Cell Biology', 'Genetics', 'Human Physiology', 'Plant Physiology', 'Ecology']
};

export const SUBJECT_HEX: Record<string, { fill: string; stroke: string }> = {
  Physics: { fill: 'rgba(59, 130, 246, 0.2)', stroke: '#2563eb' },
  Chemistry: { fill: 'rgba(16, 185, 129, 0.2)', stroke: '#059669' },
  Biology: { fill: 'rgba(245, 158, 11, 0.2)', stroke: '#d97706' },
  Mathematics: { fill: 'rgba(249, 115, 22, 0.2)', stroke: '#ea580c' },
};
