"use client";
import { useState } from "react";
import { generatePolygon, generatePartial, generateAttention, gradeSubmission } from "@/lib/backend";

type TestType = "basic" | "memory" | "attention";

export function useAssessment() {
    const [points, setPoints] = useState<any[]>([]);
    const [trueOrder, setTrueOrder] = useState<number[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [currentSublevel, setCurrentSublevel] = useState<number>(1);
    const [testType, setTestType] = useState<TestType>("basic");
    const [mistakes, setMistakes] = useState<number>(0);
    const [driftParameters, setDriftParameters] = useState<any>(null);
    const [highlightSchedule, setHighlightSchedule] = useState<any[]>([]);
    const [clickedIndices, setClickedIndices] = useState<Set<number>>(new Set());

    async function start(level: number, sublevel: number, type: TestType = "basic") {
        setCurrentLevel(level);
        setCurrentSublevel(sublevel);
        setTestType(type);
        setMistakes(0);
        setClickedIndices(new Set());

        let data;
        if (type === "basic") {
            data = await generatePolygon(level, sublevel);
        } else if (type === "memory") {
            // For memory test, show 75% of labels initially
            data = await generatePartial(level, sublevel, 0.75);
            
            // Select random 30% of points to flash
            if (data.points && data.points.length > 0) {
                const numToFlash = Math.max(1, Math.floor(data.points.length * 0.3));
                const indices = data.points.map((_: any, i: number) => i);
                const shuffled = indices.sort(() => Math.random() - 0.5);
                const selectedIndices = shuffled.slice(0, numToFlash);
                
                // Create flash schedule for selected points
                const schedule: any[] = [];
                selectedIndices.forEach((idx: number, scheduleIdx: number) => {
                    schedule.push({
                        index: idx,
                        start_ms: scheduleIdx * 5000, // Flash every 5 seconds
                        duration_ms: 1000 // Flash for 1 second
                    });
                });
                
                data.highlight_schedule = schedule;
            }
        } else if (type === "attention") {
            // For attention test, add drift and highlights
            data = await generateAttention(level, sublevel, 0.01, 0.5, 0.15);
            
            // Override to select only 1-2 random points to drift
            if (data.points && data.points.length > 0) {
                const numToDrift = Math.random() > 0.5 ? 2 : 1;
                const indices = data.points.map((_: any, i: number) => i);
                const shuffled = indices.sort(() => Math.random() - 0.5);
                const driftingIndices = shuffled.slice(0, numToDrift);
                
                // Store which points should drift
                data.driftParameters = {
                    amplitude: 0.01,
                    frequency: 0.5,
                    driftingIndices // Only these indices will drift
                };
                
                // Create random highlight schedule for 1-2 points
                const numToHighlight = Math.random() > 0.5 ? 2 : 1;
                const highlightIndices = shuffled.slice(numToDrift, numToDrift + numToHighlight);
                const schedule: any[] = [];
                highlightIndices.forEach((idx: number, scheduleIdx: number) => {
                    schedule.push({
                        index: idx,
                        start_ms: scheduleIdx * 4000 + 2000, // Offset start
                        duration_ms: 800
                    });
                });
                data.highlight_schedule = schedule;
            }
        } else {
            data = await generatePolygon(level, sublevel);
        }

        setPoints(data.points);
        setTrueOrder(data.true_order);
        setDriftParameters(data.drift_parameters || null);
        setHighlightSchedule(data.highlight_schedule || []);
        setStartTime(Date.now());
        setSubmissions([]);
    }

    function recordClick(pointIndex: number) {
        const timestamp = Date.now();
        
        // Check if this is the correct next point
        const expectedIndex = trueOrder[submissions.length];
        const isCorrect = pointIndex === expectedIndex;
        
        // Check if already clicked
        if (clickedIndices.has(pointIndex)) {
            // Don't record duplicate clicks, but could show feedback
            return;
        }

        if (!isCorrect) {
            setMistakes(prev => prev + 1);
        }

        // Record the submission
        setSubmissions(prev => [...prev, {
            selected_index: pointIndex,
            timestamp_ms: timestamp
        }]);

        setClickedIndices(prev => new Set([...prev, pointIndex]));
    }

    async function finish() {
        const end = Date.now();
        return await gradeSubmission({
            true_order: trueOrder,
            submissions,
            start_time_ms: startTime,
            end_time_ms: end,
            mistakes: mistakes,
            metadata: { 
                total_clicks: submissions.length,
                test_type: testType,
                level: currentLevel,
                sublevel: currentSublevel
            }
        });
    }

    return {
        points,
        trueOrder,
        currentLevel,
        currentSublevel,
        testType,
        startTime,
        mistakes,
        submissions,
        driftParameters,
        highlightSchedule,
        clickedIndices,
        start,
        recordClick,
        finish
    };
}
