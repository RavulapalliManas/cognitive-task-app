"use client";
import { useState, useCallback } from "react";
import { generateLevel7, gradeLevel7 } from "@/lib/backend";

export function useReconstructionTask() {
    const [targetPolygon, setTargetPolygon] = useState<any[]>([]);
    const [displayTimeMs, setDisplayTimeMs] = useState<number>(5000);
    const [reconstructionTime, setReconstructionTime] = useState<number>(0);
    const [reconstructionComplete, setReconstructionComplete] = useState<boolean>(false);

    const startReconstruction = useCallback(async (level: number, sublevel: number) => {
        setReconstructionTime(0);
        setReconstructionComplete(false);

        const data = await generateLevel7(sublevel);
        setTargetPolygon(data.target_polygon);
        setDisplayTimeMs(data.display_time_ms);
    }, []);

    const submitReconstruction = useCallback(async (userPolygon: any[], timeTakenMs: number) => {
        if (userPolygon.length === 0 || targetPolygon.length === 0) return null;

        const result = await gradeLevel7({
            target_polygon: targetPolygon,
            user_polygon: userPolygon,
            time_taken_ms: timeTakenMs
        });

        setReconstructionComplete(true);
        setReconstructionTime(timeTakenMs);
        return result;
    }, [targetPolygon]);

    return {
        targetPolygon,
        displayTimeMs,
        reconstructionTime,
        reconstructionComplete,
        startReconstruction,
        submitReconstruction
    };
}
