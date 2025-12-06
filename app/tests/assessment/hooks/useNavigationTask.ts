
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PointLabel {
    x: number;
    y: number;
    index: number;
}

export function useNavigationTask() {
    const [leftWall, setLeftWall] = useState<PointLabel[]>([]);
    const [rightWall, setRightWall] = useState<PointLabel[]>([]);
    const [startPoint, setStartPoint] = useState<PointLabel | null>(null);
    const [endPoint, setEndPoint] = useState<PointLabel | null>(null);
    const [optimalPath, setOptimalPath] = useState<PointLabel[]>([]);

    // Results
    const [pathEfficiency, setPathEfficiency] = useState<number>(0);
    const [deviationScore, setDeviationScore] = useState<number>(0);
    const [navigationCompositeScore, setNavigationCompositeScore] = useState<number>(0);

    const startNavigation = useCallback(async (difficulty: number) => {
        try {
            const res = await axios.post(`${API_URL}/generate_level_8`, {
                difficulty
            });
            setLeftWall(res.data.left_wall);
            setRightWall(res.data.right_wall);
            setStartPoint(res.data.start_point);
            setEndPoint(res.data.end_point);
            setOptimalPath(res.data.optimal_path);

            // Reset scores
            setPathEfficiency(0);
            setDeviationScore(0);
            setNavigationCompositeScore(0);
        } catch (error) {
            console.error("Failed to start navigation task", error);
        }
    }, []);

    const submitNavigation = useCallback(async (userPath: PointLabel[], timeTakenMs: number, wallCollisions: number) => {
        try {
            const res = await axios.post(`${API_URL}/grade_level_8`, {
                user_path: userPath,
                optimal_path: optimalPath,
                time_taken_ms: timeTakenMs,
                wall_collisions: wallCollisions
            });

            setPathEfficiency(res.data.path_efficiency);
            setDeviationScore(res.data.deviation_score);
            setNavigationCompositeScore(res.data.composite_score);

            return res.data;
        } catch (error) {
            console.error("Failed to submit navigation task", error);
            return null;
        }
    }, [optimalPath]);

    return {
        leftWall,
        rightWall,
        startPoint,
        endPoint,
        startNavigation,
        submitNavigation,
        pathEfficiency,
        deviationScore,
        navigationCompositeScore
    };
}
