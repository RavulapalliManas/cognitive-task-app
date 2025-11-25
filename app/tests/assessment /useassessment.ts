"use client";
import { useState } from "react";
import { generatePolygon, gradeSubmission } from "@/lib/backend";

export function useAssessment() {
    const [points, setPoints] = useState<any[]>([]);
    const [trueOrder, setTrueOrder] = useState<number[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);

    async function start(level: number, sublevel: number) {
        const data = await generatePolygon(level, sublevel);
        setPoints(data.points);
        setTrueOrder(data.true_order);
        setStartTime(Date.now());
        setSubmissions([]);
    }

    function recordClick(pointIndex: number) {
        setSubmissions(prev => [...prev, {
            selected_index: pointIndex,
            timestamp_ms: Date.now()
        }]);
    }

    async function finish() {
        const end = Date.now();
        return await gradeSubmission({
            true_order: trueOrder,
            submissions,
            start_time_ms: startTime,
            end_time_ms: end,
            mistakes: 0,
            metadata: { total_clicks: submissions.length }
        });
    }

    return {
        points,
        trueOrder,
        start,
        recordClick,
        finish
    };
}
