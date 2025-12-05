"use client";
import { useState, useCallback } from "react";
import { generateLevel6, gradeLevel6 } from "@/lib/backend";

export function useIntersectionTask() {
    const [polygonA, setPolygonA] = useState<any>(null);
    const [polygonB, setPolygonB] = useState<any>(null);
    const [intersectionThreshold, setIntersectionThreshold] = useState<number>(15);
    const [animationDuration, setAnimationDuration] = useState<number>(10000);
    const [detectionTime, setDetectionTime] = useState<number | null>(null);
    const [intersectionArea, setIntersectionArea] = useState<number>(0);

    const startIntersection = useCallback(async (level: number, sublevel: number) => {
        setDetectionTime(null);
        setIntersectionArea(0);

        const data = await generateLevel6(sublevel);
        setPolygonA(data.polygon_a);
        setPolygonB(data.polygon_b);
        setIntersectionThreshold(data.intersection_threshold);
        setAnimationDuration(data.animation_duration_ms);
    }, []);

    const recordIntersectionDetection = useCallback((detectionTimeMs: number, actualTimeMs: number | null, currentArea: number) => {
        setDetectionTime(detectionTimeMs);
        setIntersectionArea(currentArea);
        // We can store actualTimeMs in state if needed or just use it in submission
        // But since submit is separate, we need to store it
        // Reusing state logic safely
    }, []);

    const submitIntersection = useCallback(async (detectionTimeMs: number, actualTimeMs: number, threshold: number) => {
        if (!polygonA || !polygonB) return null;

        const result = await gradeLevel6({
            detection_time_ms: detectionTimeMs,
            actual_intersection_time_ms: actualTimeMs,
            threshold_percentage: threshold
        });

        return result;
    }, [polygonA, polygonB]);

    return {
        polygonA,
        polygonB,
        intersectionThreshold,
        animationDuration,
        detectionTime,
        intersectionArea,
        startIntersection,
        recordIntersectionDetection,
        submitIntersection
    };
}
