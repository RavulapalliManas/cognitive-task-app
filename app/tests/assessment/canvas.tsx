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
    testType: "basic" | "memory" | "attention" | "combined";
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

    // Refs for animation to avoid React render loop
    const pointGroupRefs = React.useRef<Map<number, SVGGElement>>(new Map());
    const animationFrameRef = React.useRef<number | null>(null);
    const startTimeRef = React.useRef<number | null>(null);

    // Visual constants
    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;
    const PADDING = 60;
    const POINT_RADIUS = 42;
    const HOVER_RADIUS = 52;
    const LINE_WIDTH = 10;
    const CLOSING_LINE_WIDTH = 13;

    // Reset state when points change
    useEffect(() => {
        setHoveredPoint(null);
        setWrongClick(null);
        setFlashingPoints(new Set());
        // Clean up animation on unmount or point change
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        // Reset transforms
        pointGroupRefs.current.forEach(el => {
            if (el) el.setAttribute("transform", "");
        });
    }, [points]);

    // Keep strict start time ref
    useEffect(() => {
        startTimeRef.current = startTime;
    }, [startTime]);

    // Track clicked points
    useEffect(() => {
        const clicked = new Set(submissions.map(s => s.selected_index));
        setClickedPoints(clicked);
    }, [submissions]);

    // Flash schedule
    useEffect(() => {
        if ((testType === "memory" || testType === "combined") && highlightSchedule.length > 0 && startTime) {
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

                // Only update if changed to avoid renders
                setFlashingPoints(prev => {
                    let changed = false;
                    if (prev.size !== newFlashing.size) changed = true;
                    else {
                        for (const val of newFlashing) if (!prev.has(val)) changed = true;
                    }
                    return changed ? newFlashing : prev;
                });
            };

            const interval = setInterval(checkFlashes, 100);
            return () => clearInterval(interval);
        }
    }, [testType, highlightSchedule, startTime]);

    // OPTIMIZED: Direct DOM manipulation for animation
    useEffect(() => {
        const shouldAnimate = (testType === "attention" || testType === "combined") &&
            startTime &&
            driftParameters?.driftingIndices &&
            driftParameters.driftingIndices.length > 0;

        if (shouldAnimate) {
            const animate = () => {
                if (!startTimeRef.current) return;

                const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
                const { amplitude, frequency, driftingIndices } = driftParameters!;

                driftingIndices?.forEach(idx => {
                    const el = pointGroupRefs.current.get(idx);
                    if (el) {
                        const angle = elapsed * frequency * 2 * Math.PI;
                        const offsetX = Math.cos(angle) * amplitude * SVG_WIDTH;
                        const offsetY = Math.sin(angle) * amplitude * SVG_HEIGHT;

                        // Use transform translate to move the group
                        el.setAttribute("transform", `translate(${offsetX}, ${offsetY})`);
                    }
                });

                animationFrameRef.current = requestAnimationFrame(animate);
            };

            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            // Reset transforms if not animating
            pointGroupRefs.current.forEach(el => {
                if (el) el.setAttribute("transform", "");
            });
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [testType, startTime, driftParameters]);

    // Handle point click
    const handlePointClick = (pointIndex: number) => {
        const nextExpected = trueOrder[submissions.length];

        if (pointIndex === nextExpected) {
            onClickPoint(pointIndex);
        } else {
            setWrongClick(pointIndex);
            setTimeout(() => setWrongClick(null), 300);
            onClickPoint(pointIndex);
        }
    };

    const toSVGCoords = (point: PointType): { x: number; y: number } => {
        // Base coordinates only - drift is applied via transform
        return {
            x: PADDING + point.x * (SVG_WIDTH - 2 * PADDING),
            y: PADDING + point.y * (SVG_HEIGHT - 2 * PADDING),
        };
    };

    // Note: Line connections might look detached during drift because we aren't updating React state for lines.
    // However, usually drift is small enough OR we accept lines connect to base. 
    // If lines MUST follow drift, we need to update lines via Ref too, which is harder.
    // For Level 3/4, drifting points are usually targets, connecting them while moving is the challenge.
    // Ideally, we'd update lines. For now, let's assume lines connect to the static 'base' position
    // OR we update lines on click. 
    // Given 'high ram usage' complaint, stable lines is better than crashing.

    // Actually, to make lines follow, we would need to update the path 'd' attribute in the loop too.
    // Let's implement that for robustness if lines exist.
    const pathRef = React.useRef<SVGPathElement>(null);
    const closingPathRef = React.useRef<SVGPathElement>(null);

    // Update lines in animation loop if needed
    // (Optional enhancement: add this logic to the animation loop above if lines need to stick to moving points)
    // For this fix, let's treat the lines as connecting the *clicked* locations (which were drifting at click time).
    // BUT since we don't store the "drift at click time", the lines will connect to base positions.
    // This is a trade-off. If the user wants lines to connect to where the dot WAS, we need to capture that position on click.

    const generateConnectionPath = (): string => {
        if (submissions.length === 0) return "";
        return submissions.map((sub, i) => {
            const point = points.find(p => p.index === sub.selected_index);
            if (!point) return "";
            const coords = toSVGCoords(point);
            // NOTE: This uses base coords. If we want exact clicked coords, we should store them in submissions.
            // But refactoring backend/storage for that is out of scope. 
            // The drift is visual.
            return `${i === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
        }).join(" ");
    };

    const generateClosingPath = (): string | null => {
        if (submissions.length !== trueOrder.length || submissions.length === 0) return null;
        const lastPt = points.find(p => p.index === submissions[submissions.length - 1].selected_index);
        const firstPt = points.find(p => p.index === submissions[0].selected_index);
        if (!lastPt || !firstPt) return null;
        const l = toSVGCoords(lastPt);
        const f = toSVGCoords(firstPt);
        return `M ${l.x} ${l.y} L ${f.x} ${f.y}`;
    };

    if (!points || points.length === 0 || !trueOrder) {
        return (
            <div className="w-full flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-2xl p-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Loading test...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-2xl p-8">
            <svg
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg"
                style={{ maxWidth: "100%", height: "auto" }}
            >
                <path
                    ref={pathRef}
                    d={generateConnectionPath()}
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth={LINE_WIDTH}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {submissions.length === trueOrder.length && (
                    <path
                        ref={closingPathRef}
                        d={generateClosingPath() || ""}
                        stroke="rgb(34, 197, 94)"
                        strokeWidth={CLOSING_LINE_WIDTH}
                        fill="none"
                        strokeLinecap="round"
                    />
                )}

                {points.map((point) => {
                    const coords = toSVGCoords(point);
                    const isClicked = clickedPoints.has(point.index);
                    const isHovered = hoveredPoint === point.index;
                    const isWrong = wrongClick === point.index;
                    const isFlashing = flashingPoints.has(point.index);
                    const radius = isHovered ? HOVER_RADIUS : POINT_RADIUS;

                    let fillColor = "rgba(59, 130, 246, 0.9)";
                    if (isWrong) fillColor = "rgb(239, 68, 68)";
                    else if (isFlashing) fillColor = "rgb(234, 179, 8)";
                    else if (isClicked) fillColor = "rgb(34, 197, 94)";

                    return (
                        <g
                            key={point.index}
                            ref={(el) => {
                                if (el) pointGroupRefs.current.set(point.index, el);
                                else pointGroupRefs.current.delete(point.index);
                            }}
                            role="button"
                            onClick={() => handlePointClick(point.index)}
                            onMouseEnter={() => setHoveredPoint(point.index)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            style={{ cursor: "pointer" }}
                            // Initial transform based on base coords
                            transform={`translate(0,0)`}
                        >
                            <circle
                                cx={coords.x}
                                cy={coords.y}
                                r={radius}
                                fill={fillColor}
                                stroke="white"
                                strokeWidth={2}
                                style={{ transition: "r 0.2s ease, fill 0.3s ease" }}
                            />
                            {point.label && (
                                <text
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="32px"
                                    fontWeight="bold"
                                    fill={isClicked ? "white" : "#1f2937"}
                                    pointerEvents="none"
                                    style={{ userSelect: "none" }}
                                >
                                    {point.label}
                                </text>
                            )}
                            {(testType === "memory" || testType === "combined") && !point.label && !isClicked && (
                                <text
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="32px"
                                    fontWeight="bold"
                                    fill="#9ca3af"
                                    pointerEvents="none"
                                    style={{ userSelect: "none" }}
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
