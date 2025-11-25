const BASE_URL = "http://127.0.0.1:8000";

export async function generatePolygon(level: number, sublevel: number) {
    const res = await fetch(`${BASE_URL}/generate_polygon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, sublevel })
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
