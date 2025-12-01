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
            // Basic test: complexity increases with sublevel
            data = await generatePolygon(level, sublevel);
        } else if (type === "memory") {
            // Memory test: progressive difficulty across sublevels
            // Sublevel 1: 95% labels visible (easiest)
            // Sublevel 2: 85% visible
            // Sublevel 3: 75% visible
            // Sublevel 4: 65% visible
            // Sublevel 5: 55% visible (hardest)
            const labelCoverage = Math.max(0.55, 1.05 - (sublevel * 0.1));
            data = await generatePartial(level, sublevel, labelCoverage);
            
            // Flash more points as sublevel increases
            // Sublevel 1: 20% flash, Sublevel 5: 40% flash
            if (data.points && data.points.length > 0) {
                const flashPercentage = 0.20 + (sublevel - 1) * 0.05; // 20% to 40%
                const numToFlash = Math.max(1, Math.floor(data.points.length * flashPercentage));
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
            // Attention test: more drift as sublevel increases
            // Sublevel 1: 0.02 amplitude, Sublevel 5: 0.06 amplitude
            const driftAmplitude = 0.02 + (sublevel - 1) * 0.01;
            const driftFrequency = 0.4 + (sublevel - 1) * 0.05; // Faster drift at higher sublevels
            
            data = await generateAttention(level, sublevel, driftAmplitude, driftFrequency, 0.15);
            
            // More points drift as sublevel increases
            // Sublevel 1-2: 1 point, Sublevel 3: 2 points, Sublevel 4-5: 3 points
            if (data.points && data.points.length > 0) {
                let numToDrift = 1;
                if (sublevel >= 4) numToDrift = 3;
                else if (sublevel >= 3) numToDrift = 2;
                
                const indices = data.points.map((_: any, i: number) => i);
                const shuffled = indices.sort(() => Math.random() - 0.5);
                const driftingIndices = shuffled.slice(0, numToDrift);
                
                // Store which points should drift with progressive amplitude
                data.driftParameters = {
                    amplitude: driftAmplitude,
                    frequency: driftFrequency,
                    driftingIndices // Progressive number of drifting points
                };
                
                // Create random highlight schedule
                const numToHighlight = sublevel <= 2 ? 1 : 2; // More highlights at higher sublevels
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
        setDriftParameters(data.driftParameters || data.drift_parameters || null);
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
