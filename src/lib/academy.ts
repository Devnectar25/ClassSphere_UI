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

export const TEST_TYPES = ['Unit Test', 'Mid Term', 'Final', 'Practical', 'Assessment'];

/** Grade colour for badges (scale: A+ ≥ 90, A ≥ 80, B+ ≥ 70, B ≥ 60, C ≥ 50, D ≥ 40, F below). */
export function gradeClass(grade: string | null | undefined) {
    if (!grade) return 'badge-secondary';
    if (grade.startsWith('A')) return 'badge-success';
    if (grade.startsWith('B')) return 'badge-primary';
    if (grade === 'C' || grade === 'D') return 'badge-warning';
    return 'badge-danger';
}
