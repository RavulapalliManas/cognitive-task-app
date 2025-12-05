"use client";
import { useState, useCallback } from "react";
import { generateLevel5, gradeLevel5 } from "@/lib/backend";

export function useRecognitionTask() {
    const [recognitionTask, setRecognitionTask] = useState<any>(null);
    const [recognitionSubmitted, setRecognitionSubmitted] = useState<boolean>(false);

    const startRecognition = useCallback(async (level: number, sublevel: number) => {
        setRecognitionTask(null);
        setRecognitionSubmitted(false);

        const data = await generateLevel5(sublevel);
        setRecognitionTask(data);
    }, []);

    const submitRecognition = useCallback(async (startTime: number, selectedIndex: number, confidence: number) => {
        if (!recognitionTask) return null;

        const endTime = Date.now();
        const reactionTime = endTime - startTime;

        const result = await gradeLevel5({
            target_index: recognitionTask.target_shape_index,
            selected_index: selectedIndex,
            confidence_rating: confidence,
            reaction_time_ms: reactionTime
        });

        setRecognitionSubmitted(true);
        return result;
    }, [recognitionTask]);

    return {
        recognitionTask,
        recognitionSubmitted,
        startRecognition,
        submitRecognition
    };
}
