const BASE_URL = "http://127.0.0.1:8000";

export async function generatePolygon(level: number, sublevel: number) {
    const res = await fetch(`${BASE_URL}/generate_polygon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel })
    });
    return res.json();
}

export async function generatePartial(level: number, sublevel: number, label_coverage: number = 0.75) {
    const res = await fetch(`${BASE_URL}/generate_partial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel, label_coverage })
    });
    return res.json();
}

export async function generateAttention(
    level: number, 
    sublevel: number, 
    drift_amplitude: number = 0.01, 
    drift_frequency: number = 0.5,
    highlight_probability: number = 0.1
) {
    const res = await fetch(`${BASE_URL}/generate_attention`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel, drift_amplitude, drift_frequency, highlight_probability })
    });
    return res.json();
}

export async function gradeSubmission(data: any) {
    const res = await fetch(`${BASE_URL}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

// =====================================================
// LEVEL 5: SHAPE RECOGNITION
// =====================================================

export async function generateLevel5(level: number, sublevel: number, seed?: number) {
    const res = await fetch(`${BASE_URL}/generate_level_5`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel, seed })
    });
    return res.json();
}

export async function gradeLevel5(data: {
    target_index: number;
    selected_index: number;
    reaction_time_ms: number;
    confidence_rating: number;
    time_limit_ms?: number;
}) {
    const res = await fetch(`${BASE_URL}/grade_level_5`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

// =====================================================
// LEVEL 6: POLYGON INTERSECTION
// =====================================================

export async function generateLevel6(level: number, sublevel: number, seed?: number) {
    const res = await fetch(`${BASE_URL}/generate_level_6`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel, seed })
    });
    return res.json();
}

export async function computeIntersection(
    polygon_a: Array<{x: number, y: number}>,
    polygon_b: Array<{x: number, y: number}>
) {
    const res = await fetch(`${BASE_URL}/compute_intersection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon_a, polygon_b })
    });
    return res.json();
}

export async function gradeLevel6(data: {
    detection_time_ms: number;
    actual_intersection_time_ms: number;
    threshold_percentage: number;
    estimated_area?: number;
    actual_area?: number;
}) {
    const res = await fetch(`${BASE_URL}/grade_level_6`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

// =====================================================
// LEVEL 7: MEMORY RECONSTRUCTION
// =====================================================

export async function generateLevel7(level: number, sublevel: number, seed?: number) {
    const res = await fetch(`${BASE_URL}/generate_level_7`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel, seed })
    });
    return res.json();
}

export async function gradeLevel7(data: {
    target_polygon: Array<{x: number, y: number}>;
    user_polygon: Array<{x: number, y: number}>;
    time_taken_ms: number;
}) {
    const res = await fetch(`${BASE_URL}/grade_level_7`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

// =====================================================
// COMPOSITE SCORING
// =====================================================

export async function computeCompositeScore(all_level_results: any[]) {
    const res = await fetch(`${BASE_URL}/compute_composite_score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all_level_results })
    });
    return res.json();
}

