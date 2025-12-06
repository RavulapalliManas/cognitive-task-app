"use client";
import { useState, useCallback } from "react";
import { generateLevel7, gradeLevel7 } from "@/lib/backend";

export function useReconstructionTask() {
    const [targetPolygon, setTargetPolygon] = useState<any[]>([]); // Keeping name for compatibility, mapped to 'path'
    const [leftWall, setLeftWall] = useState<any[]>([]);
    const [rightWall, setRightWall] = useState<any[]>([]);
    const [displayTimeMs, setDisplayTimeMs] = useState<number>(5000);
    const [reconstructionTime, setReconstructionTime] = useState<number>(0);
    const [reconstructionComplete, setReconstructionComplete] = useState<boolean>(false);

    const startReconstruction = useCallback(async (level: number, sublevel: number) => {
        setReconstructionTime(0);
        setReconstructionComplete(false);

        const data = await generateLevel7(sublevel);
        // Map backend response (path/walls) to state
        setTargetPolygon(data.path || []);
        setLeftWall(data.left_wall || []);
        setRightWall(data.right_wall || []);
        setDisplayTimeMs(data.display_time_ms || 0);
    }, []);

    const submitReconstruction = useCallback(async (userPolygon: any[], timeTakenMs: number, timestamps?: number[]) => {
        // userPolygon is passed as user_path
        if (userPolygon.length === 0) return null;

        const result = await gradeLevel7({
            user_path: userPolygon,
            maze_path: targetPolygon,
            time_taken_ms: timeTakenMs,
            user_timestamps: timestamps
        });

        setReconstructionComplete(true);
        setReconstructionTime(timeTakenMs);
        return result;
    }, [targetPolygon]);

    return {
        targetPolygon, // effectively mazePath
        leftWall,
        rightWall,
        displayTimeMs,
        reconstructionTime,
        reconstructionComplete,
        startReconstruction,
        submitReconstruction
    };
}
