"use client";
import { useState, useCallback } from "react";
import {
    generatePolygon,
    generatePartial,
    generateAttention,
    gradeSubmission
} from "@/lib/backend";

export type TestType = "basic" | "memory" | "attention" | "combined";

export function useTracingTask() {
    const [points, setPoints] = useState<any[]>([]);
    const [trueOrder, setTrueOrder] = useState<number[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [mistakes, setMistakes] = useState<number>(0);
    const [driftParameters, setDriftParameters] = useState<any>(null);
    const [highlightSchedule, setHighlightSchedule] = useState<any[]>([]);
    const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
    const [clickedIndices, setClickedIndices] = useState<Set<number>>(new Set());
    const kineticRef = useState<{ current: any[] }>({ current: [] })[0]; // Use ref pattern but force stability

    const startTracing = useCallback(async (level: number, sublevel: number, type: TestType) => {
        // Clear state
        setSubmissions([]);
        setClickedIndices(new Set());
        setMistakes(0);
        setPoints([]);
        setTrueOrder([]);
        setDriftParameters(null);
        setHighlightSchedule([]);
        setHiddenIndices([]); // Clear previous
        kineticRef.current = []; // Reset kinetic data


        let data;
        if (type === "basic") {
            data = await generatePolygon(level, sublevel);
        } else if (type === "memory") {
            const labelCoverage = Math.max(0.55, 1.05 - (sublevel * 0.1));
            data = await generatePartial(level, sublevel, labelCoverage);
            setHiddenIndices(data.hidden_indices || []); // Store valid hidden indices

            if (data.points && data.points.length > 0) {
                const flashPercentage = 0.20 + (sublevel - 1) * 0.05;
                const numToFlash = Math.max(1, Math.floor(data.points.length * flashPercentage));
                const indices = data.points.map((_: any, i: number) => i);
                const shuffled = indices.sort(() => Math.random() - 0.5);
                const selectedIndices = shuffled.slice(0, numToFlash);

                const schedule: any[] = [];
                selectedIndices.forEach((idx: number, scheduleIdx: number) => {
                    schedule.push({
                        index: idx,
                        start_ms: scheduleIdx * 5000,
                        duration_ms: 1000
                    });
                });
                data.highlight_schedule = schedule;
            }
        } else if (type === "attention") {
            const driftAmplitude = 0.02 + (sublevel - 1) * 0.01;
            const driftFrequency = 0.4 + (sublevel - 1) * 0.05;
            data = await generateAttention(level, sublevel, driftAmplitude, driftFrequency, 0.15);

            if (data.points && data.points.length > 0) {
                // Use backend provided drift parameters
                data.highlight_schedule = [];
            }
        } else if (type === "combined") {
            const labelCoverage = Math.max(0.65, 0.95 - (sublevel * 0.1));
            const driftAmplitude = 0.03 + (sublevel - 1) * 0.01;
            const driftFrequency = 0.5 + (sublevel - 1) * 0.05;
            data = await generateAttention(level, sublevel, driftAmplitude, driftFrequency, labelCoverage);

            if (data.points && data.points.length > 0) {
                const allIndices = data.points.map((_: any, i: number) => i);
                const shuffled = [...allIndices].sort(() => Math.random() - 0.5);

                const flashPercentage = 0.25 + (sublevel - 1) * 0.05;
                const numToFlash = Math.max(1, Math.floor(data.points.length * flashPercentage));
                const flashIndices = shuffled.slice(0, numToFlash);

                const schedule: any[] = [];
                flashIndices.forEach((idx: number, scheduleIdx: number) => {
                    schedule.push({
                        index: idx,
                        start_ms: scheduleIdx * 4000,
                        duration_ms: 1000
                    });
                });
                data.highlight_schedule = schedule;

                // Use backend provided drift parameters
            }
        }

        setPoints(data.points || []);
        setTrueOrder(data.true_order || []);
        setDriftParameters(data.driftParameters || data.drift_parameters || null);
        setHighlightSchedule(data.highlight_schedule || []);
    }, []);

    const recordClick = useCallback((pointIndex: number) => {
        if (!trueOrder || !submissions) return;
        const timestamp = Date.now();
        const expectedIndex = trueOrder[submissions.length];
        const isCorrect = pointIndex === expectedIndex;

        if (clickedIndices.has(pointIndex)) return;

        if (!isCorrect) {
            setMistakes(prev => prev + 1);
        }

        setSubmissions(prev => [...(prev || []), {
            selected_index: pointIndex,
            timestamp_ms: timestamp
        }]);
        setClickedIndices(prev => new Set([...prev, pointIndex]));
    }, [trueOrder, submissions, clickedIndices]);

    const undoLastClick = useCallback(() => {
        if (!submissions || submissions.length === 0) return;
        const lastSubmission = submissions[submissions.length - 1];
        setSubmissions(prev => (prev || []).slice(0, -1));
        setClickedIndices(prev => {
            const newSet = new Set(prev);
            newSet.delete(lastSubmission.selected_index);
            return newSet;
        });
        if (trueOrder && trueOrder.length > 0) {
            const expectedIndex = trueOrder[submissions.length - 1];
            if (lastSubmission.selected_index !== expectedIndex) {
                setMistakes(prev => Math.max(0, prev - 1));
            }
        }
    }, [submissions, trueOrder]);

    const submitTracing = useCallback(async (startTime: number, currentLevel: number, currentSublevel: number, type: TestType) => {
        const end = Date.now();
        return await gradeSubmission({
            true_order: trueOrder,
            submissions,
            start_time_ms: startTime,
            end_time_ms: end,
            mistakes: mistakes,
            level: currentLevel,   // Added top-level
            sublevel: currentSublevel, // Added top-level
            metadata: {
                total_clicks: submissions.length,
                test_type: type,
                level: currentLevel,
                sublevel: currentSublevel,
                kinetic_data: kineticRef.current // Pass Kinetic Convex Hull history
            },
            points: points // Pass points for Delaunay analysis
        });
    }, [trueOrder, submissions, mistakes]);

    return {
        points,
        trueOrder,
        submissions,
        mistakes,
        driftParameters,
        highlightSchedule,
        hiddenIndices,
        startTracing,
        recordClick,
        undoLastClick,
        submitTracing,
        kineticRef
    };
}
