
// Monotone Chain Convex Hull Algorithm
// Returns list of points on the hull in clockwise order
export function computeConvexHull(points: { x: number, y: number }[]): { x: number, y: number }[] {
    if (points.length < 3) return points;

    // Sort by x, then y
    const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

    // Build lower hull
    const lower: { x: number, y: number }[] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    // Build upper hull
    const upper: { x: number, y: number }[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    // Concatenate (remove duplicate start/end points)
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
}

// Cross product of vectors OA and OB
// A positive cross product indicates a counter-clockwise turn, 0 indicates a collinear point, and negative indicates a clockwise turn.
function crossProduct(o: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// Shoelace formula for polygon area
export function computePolygonArea(points: { x: number, y: number }[]): number {
    let area = 0.0;
    const n = points.length;
    if (n < 3) return 0.0;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2.0;
}
