"use client";
import { useState, useCallback } from "react";
import { useTracingTask, TestType } from "./hooks/useTracingTask";
import { useRecognitionTask } from "./hooks/useRecognitionTask";
import { useIntersectionTask } from "./hooks/useIntersectionTask";
import { useReconstructionTask } from "./hooks/useReconstructionTask";
import { useNavigationTask } from "./hooks/useNavigationTask";

export function useAssessment() {
    // Shared state
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [currentSublevel, setCurrentSublevel] = useState<number>(1);
    const [testType, setTestType] = useState<TestType | "recognition" | "intersection" | "reconstruction" | "navigation">("basic");
    const [startTime, setStartTime] = useState<number | null>(null);

    // Sub-hooks
    // Sub-hooks
    const tracing = useTracingTask();
    const recognition = useRecognitionTask();
    const intersection = useIntersectionTask();
    const reconstruction = useReconstructionTask();
    const navigation = useNavigationTask();

    // Destructure stable methods to avoid dependency on the unstable hook objects
    const { startTracing, submitTracing } = tracing;
    const { startRecognition } = recognition;
    const { startIntersection } = intersection;
    const { startReconstruction } = reconstruction;
    const { startNavigation } = navigation;

    // Unified start method for Levels 1-4
    const start = useCallback(async (level: number, sublevel: number, type: TestType) => {
        setCurrentLevel(level);
        setCurrentSublevel(sublevel);
        setTestType(type);
        setStartTime(Date.now());
        await startTracing(level, sublevel, type);
    }, [startTracing]);

    // Wrappers for other levels to set common state
    const startLevel5 = useCallback(async (level: number, sublevel: number) => {
        setCurrentLevel(level);
        setCurrentSublevel(sublevel);
        setTestType("recognition");
        setStartTime(Date.now());
        await startRecognition(level, sublevel);
    }, [startRecognition]);

    const startLevel6 = useCallback(async (level: number, sublevel: number) => {
        setCurrentLevel(level);
        setCurrentSublevel(sublevel);
        setTestType("intersection");
        setStartTime(Date.now());
        await startIntersection(level, sublevel);
    }, [startIntersection]);

    const startLevel7 = useCallback(async (level: number, sublevel: number) => {
        setCurrentLevel(level);
        setCurrentSublevel(sublevel);
        setTestType("reconstruction");
        setStartTime(Date.now());
        await startReconstruction(level, sublevel);
    }, [startReconstruction]);

    const startLevel8 = useCallback(async (level: number, sublevel: number) => {
        setCurrentLevel(level);
        setCurrentSublevel(sublevel);
        setTestType("navigation");
        setStartTime(Date.now());
        // Map sublevel to difficulty (1-3)
        await startNavigation(sublevel);
    }, [startNavigation]);

    const finish = useCallback(async () => {
        if (!startTime) return null;
        // Only tracing task (Levels 1-4) uses the generic finish method in the current architecture
        // Levels 5, 6, 7 have their own submit methods called directly by components
        if (currentLevel <= 4) {
            return await submitTracing(startTime, currentLevel, currentSublevel, testType as TestType);
        }
        return null;
    }, [startTime, currentLevel, currentSublevel, testType, submitTracing]);

    return {
        // Common
        currentLevel,
        currentSublevel,
        testType,
        startTime,
        mistakes: tracing.mistakes, // Expose mistakes from tracing for HUD

        // Levels 1-4
        points: tracing.points,
        trueOrder: tracing.trueOrder,
        submissions: tracing.submissions,
        driftParameters: tracing.driftParameters,
        highlightSchedule: tracing.highlightSchedule,
        hiddenIndices: tracing.hiddenIndices, // Added
        recordClick: tracing.recordClick,
        undoLastClick: tracing.undoLastClick,
        start,
        finish,
        kineticRef: tracing.kineticRef,

        // Level 5
        startLevel5,
        recognitionTask: recognition.recognitionTask,
        recognitionSubmitted: recognition.recognitionSubmitted,
        submitRecognition: recognition.submitRecognition,

        // Level 6
        startLevel6,
        polygonA: intersection.polygonA,
        polygonB: intersection.polygonB,
        intersectionThreshold: intersection.intersectionThreshold,
        animationDuration: intersection.animationDuration,
        recordIntersectionDetection: intersection.recordIntersectionDetection,
        submitIntersection: intersection.submitIntersection,

        // Level 7
        startLevel7,
        targetPolygon: reconstruction.targetPolygon,
        displayTimeMs: reconstruction.displayTimeMs,
        submitReconstruction: reconstruction.submitReconstruction,
        mazeLeftWall: reconstruction.leftWall,
        mazeRightWall: reconstruction.rightWall,

        // Level 8 (Navigation)
        startLevel8,
        leftWall: navigation.leftWall,
        rightWall: navigation.rightWall,
        startPoint: navigation.startPoint,
        endPoint: navigation.endPoint,
        submitNavigation: navigation.submitNavigation
    };
}
