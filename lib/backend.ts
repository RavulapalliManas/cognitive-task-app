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
