/**
 * Academy Domain Configurations & Recommended Course Categories
 * Traceability: Aligns with onboarding / sign-up academy domains and course catalog
 */

export interface AcademyDomain {
    id: string; // Internal identifier ('Tuition', 'Music', 'Dance', 'Sports', 'Arts', 'Test Prep', 'Language', 'Other')
    label: string; // Display name matching the sign-up section and specification table
    categories: string[]; // Recommended categories to choose
}

export const ACADEMY_DOMAINS: AcademyDomain[] = [
    {
        id: 'Tuition',
        label: 'Tuition / Coaching',
        categories: ['Mathematics', 'Science', 'English', 'Social Studies', 'Commerce', 'Computer Science'],
    },
    {
        id: 'Music',
        label: 'Music Academy',
        categories: ['Instrumental', 'Vocal', 'Music Theory', 'Ensemble'],
    },
    {
        id: 'Dance',
        label: 'Dance Academy',
        categories: ['Classical', 'Contemporary', 'Hip-Hop'],
    },
    {
        id: 'Sports',
        label: 'Sports / Fitness / Yoga',
        categories: ['Cricket', 'Football', 'Badminton', 'Swimming', 'Athletics'],
    },
    {
        id: 'Arts',
        label: 'Arts & Crafts',
        categories: ['Drawing', 'Painting', 'Crafts'],
    },
    {
        id: 'Test Prep',
        label: 'Test Preparation',
        categories: ['Engineering Entrance', 'Medical Entrance', 'Civil Services', 'Olympiad'],
    },
    {
        id: 'Language',
        label: 'Language Institute',
        categories: ['English', 'French', 'German', 'Spanish'],
    },
    {
        id: 'Other',
        label: 'Other / Custom',
        categories: ['General'],
    },
];

/** Course categories offered per academy type, with suggested subjects for each category. */
export const COURSE_CATALOGUE: Record<string, Record<string, string[]>> = {
    Tuition: {
        Mathematics: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics', 'Calculus'],
        Science: ['Physics', 'Chemistry', 'Biology'],
        English: ['Grammar', 'Literature', 'Writing', 'Comprehension'],
        'Social Studies': ['History', 'Geography', 'Civics', 'Economics'],
        Commerce: ['Accountancy', 'Business Studies', 'Economics'],
        'Computer Science': ['Programming', 'Data Structures', 'Databases'],
    },
    Music: {
        Instrumental: ['Repertoire Performance', 'Technique & Scales', 'Sight Reading'],
        Vocal: ['Voice Training', 'Repertoire', 'Ear Training'],
        'Music Theory': ['Harmony', 'Counterpoint', 'Score Analysis'],
        Ensemble: ['Intonation', 'Ensemble Playing', 'Sectionals'],
    },
    Sports: {
        Cricket: ['Batting', 'Bowling', 'Fielding', 'Fitness'],
        Football: ['Ball Control', 'Passing', 'Tactics', 'Fitness'],
        Badminton: ['Footwork', 'Strokes', 'Match Play'],
        Swimming: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Endurance'],
        Athletics: ['Sprints', 'Endurance', 'Jumps', 'Throws'],
    },
    Dance: {
        Classical: ['Technique', 'Abhinaya', 'Rhythm', 'Choreography'],
        Contemporary: ['Technique', 'Improvisation', 'Choreography'],
        'Hip-Hop': ['Grooves', 'Freestyle', 'Choreography'],
    },
    Arts: {
        Drawing: ['Sketching', 'Perspective', 'Shading'],
        Painting: ['Watercolour', 'Acrylic', 'Composition'],
        Crafts: ['Clay Modelling', 'Paper Craft', 'Design'],
    },
    'Test Prep': {
        'Engineering Entrance': ['Physics', 'Chemistry', 'Mathematics'],
        'Medical Entrance': ['Physics', 'Chemistry', 'Biology'],
        'Civil Services': ['General Studies', 'Aptitude', 'Essay'],
        Olympiad: ['Mathematics', 'Science', 'Reasoning'],
    },
    Language: {
        English: ['Speaking', 'Listening', 'Reading', 'Writing'],
        French: ['Speaking', 'Listening', 'Reading', 'Writing'],
        German: ['Speaking', 'Listening', 'Reading', 'Writing'],
        Spanish: ['Speaking', 'Listening', 'Reading', 'Writing'],
    },
    Other: { General: [] },
};

/** Resolves the canonical domain ID ('Tuition', 'Music', 'Dance', etc.) from any academy type string */
export function getDomainKey(rawType?: string | null): string {
    if (!rawType) return 'Tuition';
    const clean = rawType.trim();
    if (COURSE_CATALOGUE[clean]) return clean;
    const exact = ACADEMY_DOMAINS.find(d => d.id.toLowerCase() === clean.toLowerCase() || d.label.toLowerCase() === clean.toLowerCase());
    if (exact) return exact.id;

    const lower = clean.toLowerCase();
    if (lower.includes('tuition') || lower.includes('coach')) return 'Tuition';
    if (lower.includes('music')) return 'Music';
    if (lower.includes('dance')) return 'Dance';
    if (lower.includes('sport') || lower.includes('fitness') || lower.includes('yoga') || lower.includes('martial')) return 'Sports';
    if (lower.includes('art') || lower.includes('craft')) return 'Arts';
    if (lower.includes('test') || lower.includes('prep') || lower.includes('entrance')) return 'Test Prep';
    if (lower.includes('language') || lower.includes('french') || lower.includes('german') || lower.includes('spanish')) return 'Language';
    return 'Other';
}

/** Returns the display domain label, e.g. "Dance Academy" */
export function getDomainLabel(rawType?: string | null): string {
    const key = getDomainKey(rawType);
    const domain = ACADEMY_DOMAINS.find(d => d.id === key);
    return domain?.label ?? (rawType?.trim() || 'Tuition / Coaching');
}

/** Returns the recommended categories for this academy domain */
export function getRecommendedCategories(rawType?: string | null): string[] {
    const key = getDomainKey(rawType);
    const domain = ACADEMY_DOMAINS.find(d => d.id === key);
    return domain ? domain.categories : Object.keys(COURSE_CATALOGUE[key] ?? COURSE_CATALOGUE.Other);
}

/** Looks up suggested subjects for a given category name across all domains */
export function getCategorySubjects(category: string, rawType?: string | null): string[] {
    if (!category) return [];
    const domainKey = getDomainKey(rawType);
    const primaryCatalogue = COURSE_CATALOGUE[domainKey] ?? COURSE_CATALOGUE.Other;
    if (primaryCatalogue[category]) return primaryCatalogue[category];

    // Search across all catalogues
    for (const catMap of Object.values(COURSE_CATALOGUE)) {
        if (catMap[category]) return catMap[category];
    }
    return [];
}

export const TEST_TYPES = ['Unit Test', 'Mid Term', 'Final', 'Practical', 'Assessment'];

/** Grade colour for badges (scale: A+ ≥ 90, A ≥ 80, B+ ≥ 70, B ≥ 60, C ≥ 50, D ≥ 40, F below). */
export function gradeClass(grade: string | null | undefined) {
    if (!grade) return 'badge-secondary';
    if (grade.startsWith('A')) return 'badge-success';
    if (grade.startsWith('B')) return 'badge-primary';
    if (grade === 'C' || grade === 'D') return 'badge-warning';
    return 'badge-danger';
}
