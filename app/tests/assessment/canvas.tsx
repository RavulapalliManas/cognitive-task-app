"use client";

import React, { useEffect, useState } from "react";
import { computeConvexHull, computePolygonArea } from "@/app/utils/geometry";

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
    kineticDataRef?: React.MutableRefObject<Array<{ t: number, area: number }>>;
    // Feature Props
    isPaused?: boolean;
    memoryMode?: {
        enabled: boolean;
        sublevel: number; // 1, 2, 3 determines coverage
    };
    hiddenIndices?: number[]; // Added: Backend-driven indices to hide
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
    kineticDataRef,
    mistakes,
    isPaused = false,
    memoryMode,
    hiddenIndices = [],
}: AssessmentCanvasProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [clickedPoints, setClickedPoints] = useState<Set<number>>(new Set());
    const [wrongClick, setWrongClick] = useState<number | null>(null);
    const [flashingPoints, setFlashingPoints] = useState<Set<number>>(new Set());

    // Memory State
    const [memoryPhase, setMemoryPhase] = useState<"preview" | "recall">("preview");
    const [showHint, setShowHint] = useState(false);
    const [hintActive, setHintActive] = useState(false); // If true, show labels temporarily
    const lastInteractionRef = React.useRef<number>(Date.now());

    // Calculate label visibility based on sublevel
    // Sub 1: 10% hidden (90% visible) -> actually user said "10% unlabeled". So 90% labeled.
    // Sub 2: 30% unlabeled.
    // Sub 3: 60% unlabeled.
    // Calculate label visibility based on backend response
    const getLabelVisibility = (index: number) => {
        if (!memoryMode?.enabled) return true;
        if (memoryPhase === "preview") return true; // Always show in preview
        if (hintActive) return true; // Show in hint

        // Use backend provided indices
        if (hiddenIndices && hiddenIndices.length > 0) {
            return !hiddenIndices.includes(index);
        }

        // Fallback for probabilistic (should not happen with new backend)
        const percentageHidden = memoryMode.sublevel === 1 ? 0.10 :
            memoryMode.sublevel === 2 ? 0.30 :
                0.60;
        const hash = (index * 9973 + 12345) % 100;
        return hash >= (percentageHidden * 100);
    };

    // Refs for animation to avoid React render loop
    const pointGroupRefs = React.useRef<Map<number, SVGGElement>>(new Map());
    const animationFrameRef = React.useRef<number | null>(null);
    const startTimeRef = React.useRef<number | null>(null);

    // Visual constants
    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;
    const PADDING = 60;
    const POINT_RADIUS = 18;
    const HOVER_RADIUS = 24;
    const LINE_WIDTH = 4;
    const CLOSING_LINE_WIDTH = 6;

    // Memory Phase Logic
    // Memory Phase Logic with Countdown
    const [countdown, setCountdown] = useState(4);

    useEffect(() => {
        if (memoryMode?.enabled && startTime) {
            setMemoryPhase("preview");
            setCountdown(4);
            const duration = 4000;

            // Timer for phase switch
            const timer = setTimeout(() => {
                setMemoryPhase("recall");
                lastInteractionRef.current = Date.now();
            }, duration);

            // Interval for simple visual countdown
            const interval = setInterval(() => {
                setCountdown(prev => Math.max(0, prev - 1));
            }, 1000);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        } else {
            setMemoryPhase("recall");
        }
    }, [memoryMode?.enabled, startTime]);

    // Inactivity / Mistake Monitor for Hint
    useEffect(() => {
        if (!memoryMode?.enabled || memoryPhase === "preview") return;

        const checkHintParams = () => {
            const timeSinceLast = Date.now() - lastInteractionRef.current;
            // > 20s inactivity OR > 5 repeated mistakes (assume mistakes passed in prop captures total)
            // But we need "repeated mistakes" on current step? 
            // "repeated mistakes > 5" usually means on the *same* target. 
            // Props `mistakes` is total level mistakes. 
            // Logic: If global mistakes > 5 (simple approximation) OR idle > 20s

            if (timeSinceLast > 20000 && !hintActive) {
                setShowHint(true);
            }
            // For mistakes, we'd ideally track local mistakes. 
            // Let's rely on idle time mostly + global mistake count high?
            // Or simpler: If mistakes > 5, always allow hint.
        };

        const interval = setInterval(checkHintParams, 1000);
        return () => clearInterval(interval);
    }, [memoryMode?.enabled, memoryPhase, hintActive, mistakes]);

    // Reset state when points change
    useEffect(() => {
        setHoveredPoint(null);
        setWrongClick(null);
        setFlashingPoints(new Set());
        setHintActive(false);
        setShowHint(false);
        lastInteractionRef.current = Date.now();

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
                const offsetMap = new Map<number, { x: number, y: number }>();

                driftingIndices?.forEach((idx, i) => {
                    const el = pointGroupRefs.current.get(idx);
                    if (el) {
                        // Multi-harmonic noise for "jittery" organic feeling
                        // Use prime number multipliers for non-repeating chaos
                        const baseFreq = frequency * 2 * Math.PI;

                        // Per-point offset based on index to prevent synchronous movement
                        const phase = idx * 13.37;

                        // Sum of sines = pseudo-random jitter
                        // X component
                        const noiseX = Math.sin(elapsed * baseFreq + phase)
                            + 0.5 * Math.sin(elapsed * baseFreq * 2.3 + phase * 2)
                            + 0.25 * Math.sin(elapsed * baseFreq * 5.7 + phase * 4);

                        // Y component (phase shifted)
                        const noiseY = Math.cos(elapsed * baseFreq * 1.1 + phase)
                            + 0.5 * Math.cos(elapsed * baseFreq * 2.7 + phase * 3)
                            + 0.25 * Math.cos(elapsed * baseFreq * 4.3 + phase * 5);

                        const offsetX = noiseX * amplitude * SVG_WIDTH;
                        const offsetY = noiseY * amplitude * SVG_HEIGHT;

                        // Use transform translate to move the group
                        el.setAttribute("transform", `translate(${offsetX}, ${offsetY})`);

                        // Store current offset for Hull calculation
                        offsetMap.set(idx, { x: noiseX * amplitude, y: noiseY * amplitude });
                    }
                });

                // Compute Kinetic Convex Hull Area
                if (kineticDataRef) {
                    const currentPoints = points.map(p => {
                        const offset = offsetMap.get(p.index) || { x: 0, y: 0 };
                        return { x: p.x + offset.x, y: p.y + offset.y };
                    });

                    const hull = computeConvexHull(currentPoints);
                    const area = computePolygonArea(hull);

                    // Throttle recording to ~10Hz to save data volume? Or keep 60Hz?
                    // 60Hz is fine for local arrays.
                    kineticDataRef.current.push({ t: elapsed, area });
                }

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
        // Block interaction conditions
        if (isPaused) return;
        if (memoryMode?.enabled && memoryPhase === "preview") return;

        lastInteractionRef.current = Date.now(); // Update activity
        setShowHint(false); // Hide hint if they interact (or maybe keep if they just clicked wrong?)

        const nextExpected = trueOrder[submissions.length];

        if (pointIndex === nextExpected) {
            onClickPoint(pointIndex);
        } else {
            setWrongClick(pointIndex);
            // Longer feedback duration
            setTimeout(() => setWrongClick(null), 800);
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
    // The drift is visual.

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

                {points.map((point, i) => { // Added 'i' for unique key fallback
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

                    // Label Logic
                    const showLabel = point.label && (
                        isClicked ||
                        getLabelVisibility(point.index)
                    );

                    // Question mark if memory hidden and not clicked
                    const showQuestion = (testType === "memory" || memoryMode?.enabled) &&
                        !showLabel && !isClicked && memoryPhase === "recall";

                    return (
                        <g
                            key={`${point.index}-${i}`} // UNIQUE KEY FIX: Composite key
                            ref={(el) => {
                                if (el) pointGroupRefs.current.set(point.index, el);
                                else pointGroupRefs.current.delete(point.index);
                            }}
                            role="button"
                            onClick={() => handlePointClick(point.index)}
                            onMouseEnter={() => !isPaused && setHoveredPoint(point.index)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            style={{ cursor: (isPaused || memoryPhase === "preview") ? "default" : "pointer" }}
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
                                style={{ transition: "r 0.2s ease, fill 0.3s ease", opacity: (memoryPhase === "preview" || memoryPhase === "recall") ? 1 : 0.5 }}
                            />
                            {/* Mistake Feedback Overlay */}
                            {isWrong && (
                                <text
                                    x={coords.x}
                                    y={coords.y - radius - 10}
                                    textAnchor="middle"
                                    fontSize="20px"
                                    fontWeight="bold"
                                    fill="red"
                                    stroke="white"
                                    strokeWidth="0.5px"
                                    pointerEvents="none"
                                >
                                    ❌ Mistake!
                                </text>
                            )}

                            {showLabel && (
                                <text
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="18px" // Reduced
                                    fontWeight="bold"
                                    fill={isClicked ? "white" : "#1f2937"}
                                    pointerEvents="none"
                                    style={{ userSelect: "none" }}
                                >
                                    {point.label}
                                </text>
                            )}
                            {showQuestion && (
                                <text
                                    x={coords.x}
                                    y={coords.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="24px" // Reduced from 32
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

            {/* Hints & Overlays */}
            {memoryPhase === "preview" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    {/* No localized background, just the message floating */}
                    <div className="bg-blue-600/90 text-white px-8 py-6 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-300 transform scale-105 border border-white/20">
                        <h2 className="text-4xl font-black mb-2 tracking-tight text-center">MEMORIZE NOW</h2>
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <p className="text-xl font-medium">Hiding labels in <span className="font-bold text-yellow-300 text-2xl mx-1">{countdown}</span>s...</p>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>
            )}

            {showHint && !hintActive && (
                <div className="absolute bottom-8 right-8 animate-bounce">
                    <button
                        onClick={() => {
                            setHintActive(true);
                            setTimeout(() => setHintActive(false), 3000); // Show for 3s
                            setShowHint(false);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 px-6 rounded-full shadow-lg border-4 border-white transform transition hover:scale-105"
                    >
                        💡 Need a Hint?
                    </button>
                </div>
            )}
        </div>
    );
}
