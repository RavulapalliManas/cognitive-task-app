"use client";

import React, { useEffect, useState } from "react";

type PointType = {
    x: number; // 0..1 normalized
    y: number; // 0..1 normalized
    label?: string | null;
    index: number;
};

interface DriftParameters {
    amplitude: number;
    frequency: number;
    driftingIndices?: number[];
}

interface AssessmentCanvasProps {
    points: PointType[];
    onClickPoint: (pointIndex: number) => void;
    testType: "basic" | "memory" | "attention";
    driftParameters?: DriftParameters;
    highlightSchedule?: Array<{ index: number; start_ms: number; duration_ms: number }>;
    startTime: number | null;
    submissions: Array<{ selected_index: number; timestamp: number }>;
    trueOrder: number[];
    mistakes: number;
}

export default function AssessmentCanvas({ 
    points, 
    onClickPoint, 
    testType,
    driftParameters,
    highlightSchedule = [],
    startTime,
    submissions,
    trueOrder,
}: AssessmentCanvasProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [clickedPoints, setClickedPoints] = useState<Set<number>>(new Set());
    const [wrongClick, setWrongClick] = useState<number | null>(null);
    const [flashingPoints, setFlashingPoints] = useState<Set<number>>(new Set());
    const [driftOffsets, setDriftOffsets] = useState<Map<number, { x: number; y: number }>>(new Map());
    
    // Visual constants - increased sizes for better visibility
    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;
    const POINT_RADIUS = 28; // Increased from 18
    const HOVER_RADIUS = 36; // Increased from 24
    const LINE_WIDTH = 5; // Increased from 3
    const CLOSING_LINE_WIDTH = 7; // Increased from 4

    // Track clicked points
    useEffect(() => {
        const clicked = new Set(submissions.map(s => s.selected_index));
        setClickedPoints(clicked);
    }, [submissions]);

    // Flash schedule for Level 2 (Memory Test)
    useEffect(() => {
        if (testType === "memory" && highlightSchedule.length > 0 && startTime) {
            const checkFlashes = () => {
                const elapsed = Date.now() - startTime;
                const newFlashing = new Set<number>();

                highlightSchedule.forEach(event => {
                    const eventStart = event.start_ms;
                    const eventEnd = event.start_ms + event.duration_ms;

                    if (elapsed >= eventStart && elapsed <= eventEnd) {
                        newFlashing.add(event.index);
                    }
                });

                setFlashingPoints(newFlashing);
            };

            const interval = setInterval(checkFlashes, 100);
            return () => clearInterval(interval);
        }
    }, [testType, highlightSchedule, startTime]);

    // Drift animation for Level 3 (Attention Test)
    useEffect(() => {
        if (testType === "attention" && startTime && driftParameters?.driftingIndices) {
            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000; // seconds
                const newOffsets = new Map<number, { x: number; y: number }>();

                driftParameters.driftingIndices!.forEach(idx => {
                    const angle = elapsed * driftParameters.frequency * 2 * Math.PI;
                    const offsetX = Math.cos(angle) * driftParameters.amplitude * SVG_WIDTH;
                    const offsetY = Math.sin(angle) * driftParameters.amplitude * SVG_HEIGHT;
                    newOffsets.set(idx, { x: offsetX, y: offsetY });
                });

                setDriftOffsets(newOffsets);
                requestAnimationFrame(animate);
            };

            const animationId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationId);
        }
    }, [testType, startTime, driftParameters]);

    // Handle point click with wrong-click flash
    const handlePointClick = (pointIndex: number) => {
        const nextExpected = trueOrder[submissions.length];
        
        if (pointIndex === nextExpected) {
            onClickPoint(pointIndex);
        } else {
            // Wrong click - flash red
            setWrongClick(pointIndex);
            setTimeout(() => setWrongClick(null), 300);
            onClickPoint(pointIndex); // Still register to increment mistakes
        }
    };

    // Convert normalized coordinates to SVG coordinates with drift
    const toSVGCoords = (point: PointType): { x: number; y: number } => {
        const drift = driftOffsets.get(point.index) || { x: 0, y: 0 };
        return {
            x: point.x * SVG_WIDTH + drift.x,
            y: point.y * SVG_HEIGHT + drift.y,
        };
    };

    // Generate path for connection lines
    const generateConnectionPath = (): string => {
        if (submissions.length === 0) return "";

        const pathParts: string[] = [];
        
        for (let i = 0; i < submissions.length; i++) {
            const pointIndex = submissions[i].selected_index;
            const point = points.find(p => p.index === pointIndex);
            if (!point) continue;

            const coords = toSVGCoords(point);
            if (i === 0) {
                pathParts.push(`M ${coords.x} ${coords.y}`);
            } else {
                pathParts.push(`L ${coords.x} ${coords.y}`);
            }
        }

        return pathParts.join(" ");
    };

    // Generate closing line path (last to first)
    const generateClosingPath = (): string | null => {
        if (submissions.length !== trueOrder.length || submissions.length === 0) return null;

        const lastIndex = submissions[submissions.length - 1].selected_index;
        const firstIndex = submissions[0].selected_index;
        const lastPoint = points.find(p => p.index === lastIndex);
        const firstPoint = points.find(p => p.index === firstIndex);

        if (!lastPoint || !firstPoint) return null;

        const lastCoords = toSVGCoords(lastPoint);
        const firstCoords = toSVGCoords(firstPoint);

        return `M ${lastCoords.x} ${lastCoords.y} L ${firstCoords.x} ${firstCoords.y}`;
    };

    const closingPath = generateClosingPath();

    return (
        <div className="w-full flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-2xl p-8">
            <svg
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg"
                style={{ maxWidth: "100%", height: "auto" }}
            >
                {/* Connection lines */}
                <path
                    d={generateConnectionPath()}
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth={LINE_WIDTH}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Closing line (last to first) */}
                {closingPath && (
                    <path
                        d={closingPath}
                        stroke="rgb(34, 197, 94)"
                        strokeWidth={CLOSING_LINE_WIDTH}
                        fill="none"
                        strokeLinecap="round"
                    />
                )}

                {/* Points */}
                {points.map((point) => {
                    const coords = toSVGCoords(point);
                    const isClicked = clickedPoints.has(point.index);
                    const isHovered = hoveredPoint === point.index;
                    const isWrong = wrongClick === point.index;
                    const isFlashing = flashingPoints.has(point.index);

                    const radius = isHovered ? HOVER_RADIUS : POINT_RADIUS;
                    
                    let fillColor = "rgba(59, 130, 246, 0.9)"; // Default blue
                    if (isWrong) fillColor = "rgb(239, 68, 68)"; // Red for wrong click
                    else if (isFlashing) fillColor = "rgb(234, 179, 8)"; // Yellow for flash
                    else if (isClicked) fillColor = "rgb(34, 197, 94)"; // Green for clicked

                    return (
                        <g
                            key={point.index}
                            role="button"
                            aria-label={`Point ${point.label || point.index}`}
                            onClick={() => handlePointClick(point.index)}
                            onMouseEnter={() => setHoveredPoint(point.index)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            style={{ cursor: "pointer" }}
                        >
                            {/* Circle */}
                            <circle
                                cx={coords.x}
                                cy={coords.y}
                                r={radius}
                                fill={fillColor}
                                stroke="white"
                                strokeWidth={2}
                                style={{
                                    transition: "r 0.2s ease, fill 0.3s ease",
                                }}
                            />

                            {/* Label */}
                            {point.label && (
                                <text
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="28px"
                                    fontWeight="bold"
                                    fill={isClicked ? "white" : "#1f2937"}
                                    pointerEvents="none"
                                    style={{
                                        userSelect: "none",
                                    }}
                                >
                                    {point.label}
                                </text>
                            )}

                            {/* For memory test, show ? for unlabeled points */}
                            {testType === "memory" && !point.label && !isClicked && (
                                <text
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="28px"
                                    fontWeight="bold"
                                    fill="#9ca3af"
                                    pointerEvents="none"
                                    style={{
                                        userSelect: "none",
                                    }}
                                >
                                    ?
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
