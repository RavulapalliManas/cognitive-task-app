"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { computeIntersection } from "@/lib/backend";

interface PolygonData {
    points: Array<{ x: number, y: number }>;
    velocity: { dx: number, dy: number };
}

interface IntersectionCanvasProps {
    polygonA: PolygonData;
    polygonB: PolygonData;
    thresholdPercentage: number;
    animationDurationMs: number;
    onDetection?: (detectionTime: number, actualIntersectionTime: number, actualArea: number) => void;
    onSubmitDrawing?: (drawnPath: Array<{ x: number, y: number }>, actualIntersection: Array<{ x: number, y: number }>, time: number) => void;
    startTime: number | null;
}

export default function IntersectionCanvas({
    polygonA,
    polygonB,
    thresholdPercentage,
    animationDurationMs,
    startTime,
    onSubmitDrawing
}: IntersectionCanvasProps) {
    const [currentPosA, setCurrentPosA] = useState(polygonA.points);
    const [currentPosB, setCurrentPosB] = useState(polygonB.points);
    const [intersectionData, setIntersectionData] = useState<any>(null);
    const [detected, setDetected] = useState(false);
    const [animationActive, setAnimationActive] = useState(false);
    const [actualIntersectionTime, setActualIntersectionTime] = useState<number | null>(null);

    const animationRef = useRef<number | null>(null);
    const lastFrameTime = useRef<number>(0);

    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;

    // Start animation when startTime is set
    useEffect(() => {
        if (startTime && !detected) {
            setAnimationActive(true);
            lastFrameTime.current = Date.now();
            animate();
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [startTime, detected]);

    // Continuous checking removed for perf, only check on freeze

    const animate = () => {
        if (!animationActive || detected) return;

        const now = Date.now();
        const deltaTime = now - lastFrameTime.current;
        lastFrameTime.current = now;

        // Update positions based on velocity
        const newPosA = currentPosA.map(p => ({
            x: p.x + polygonA.velocity.dx * deltaTime,
            y: p.y + polygonA.velocity.dy * deltaTime
        }));

        const newPosB = currentPosB.map(p => ({
            x: p.x + polygonB.velocity.dx * deltaTime,
            y: p.y + polygonB.velocity.dy * deltaTime
        }));

        setCurrentPosA(newPosA);
        setCurrentPosB(newPosB);

        // Continue animation
        if (startTime && (Date.now() - startTime) < animationDurationMs) {
            animationRef.current = requestAnimationFrame(animate);
        }
    };

    const checkIntersection = async () => {
        try {
            const result = await computeIntersection(currentPosA, currentPosB);
            setIntersectionData(result);

            // Check if threshold is met
            if (result.intersection_percentage >= thresholdPercentage && !actualIntersectionTime && startTime) {
                setActualIntersectionTime(Date.now() - startTime);
            }
        } catch (error) {
            console.error("Intersection computation failed:", error);
        }
    };

    // Drawing State
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [drawnPath, setDrawnPath] = useState<Array<{ x: number, y: number }>>([]);
    const [isPenDown, setIsPenDown] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Freeze animation when entering drawing mode
    const handleFreeze = () => {
        setAnimationActive(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setIsDrawingMode(true);
        // Compute actual intersection once at freeze time for grading
        checkIntersection();
    };

    const handlePenDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingMode || detected) return;
        setIsPenDown(true);
        const pt = getPoint(e);
        if (pt) setDrawnPath([pt]);
    };

    const handlePenMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPenDown || detected) return;
        const pt = getPoint(e);
        if (pt) setDrawnPath(prev => [...prev, pt]);
    };

    const handlePenUp = () => {
        setIsPenDown(false);
    };

    const getPoint = (e: any) => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height
        };
    };

    const handleSubmitDrawing = async () => {
        if (detected || drawnPath.length < 3) return;
        setDetected(true);
        setIsDrawingMode(false);

        // Final intersection data is already in intersectionData (from handleFreeze check)
        // But let's re-verify
        const result = await computeIntersection(currentPosA, currentPosB);
        const detectionTime = Date.now() - (startTime || 0);

        // Pass DRAWN path and ACTUAL path to parent for grading
        if (onSubmitDrawing) {
            onSubmitDrawing(drawnPath, result.intersection_polygon || [], detectionTime);
        }
    };

    // Helpers
    const toSVGCoords = (points: Array<{ x: number, y: number }>) => {
        return points.map(p => ({
            x: p.x * SVG_WIDTH,
            y: p.y * SVG_HEIGHT
        }));
    };

    const renderPolygon = (points: Array<{ x: number, y: number }>, color: string, label: string) => {
        const svgPoints = toSVGCoords(points);
        const pathData = svgPoints.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';

        return (
            <g>
                <path d={pathData} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={3} />
                {svgPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="white" strokeWidth={1.5} />
                ))}
                <text x={svgPoints[0].x} y={svgPoints[0].y - 15} fontSize="24" fontWeight="black" fill={color} stroke="white" strokeWidth="0.5">
                    {label}
                </text>
            </g>
        );
    };

    const renderIntersection = () => {
        if (!intersectionData?.intersection_polygon) return null;
        const svgPoints = toSVGCoords(intersectionData.intersection_polygon);
        const pathData = svgPoints.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';

        return (
            <g>
                <defs>
                    <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="10" style={{ stroke: '#10b981', strokeWidth: 2 }} />
                    </pattern>
                </defs>
                <path d={pathData} fill="url(#diagonalHatch)" fillOpacity={0.8} stroke="#10b981" strokeWidth={4} strokeDasharray="8 4" />
                {svgPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={5} fill="#10b981" stroke="white" strokeWidth={2} />
                ))}
            </g>
        );
    };

    return (
        <div className="w-full select-none">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 relative">
                {/* Drawing Overlay */}
                <div
                    ref={canvasRef}
                    className="absolute inset-4 z-10 cursor-crosshair touch-none"
                    style={{ pointerEvents: isDrawingMode ? 'auto' : 'none' }}
                    onMouseDown={handlePenDown}
                    onMouseMove={handlePenMove}
                    onMouseUp={handlePenUp}
                    onMouseLeave={handlePenUp}
                    onTouchStart={handlePenDown}
                    onTouchMove={handlePenMove}
                    onTouchEnd={handlePenUp}
                >
                    {/* Visualizing the draw path on top of SVG */}
                    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} style={{ overflow: 'visible' }}>
                        {drawnPath.length > 1 && (
                            <path
                                d={`M ${drawnPath.map(p => `${p.x * SVG_WIDTH} ${p.y * SVG_HEIGHT}`).join(' L ')} Z`}
                                fill="rgba(255, 255, 0, 0.3)"
                                stroke="yellow"
                                strokeWidth="4"
                            />
                        )}
                    </svg>
                </div>

                <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className="mx-auto bg-gray-50 dark:bg-gray-900 rounded-xl"
                    style={{ maxWidth: "100%", height: "auto" }}
                >
                    {renderPolygon(currentPosA, "#3b82f6", "A")}
                    {renderPolygon(currentPosB, "#ef4444", "B")}

                    {/* Only show actual intersection AFTER detection/submission */}
                    {detected && renderIntersection()}
                </svg>
            </div>

            <div className="flex justify-center gap-4">
                {!isDrawingMode && !detected && (
                    <Button
                        size="lg"
                        color="secondary"
                        onClick={handleFreeze}
                        className="text-2xl py-8 font-black w-full"
                    >
                        FREEZE & DRAW INTERSECTION
                    </Button>
                )}

                {isDrawingMode && (
                    <div className="flex flex-col w-full gap-2">
                        <div className="text-center text-gray-600 dark:text-gray-400 font-bold mb-2">
                            Draw around the overlapping area!
                        </div>
                        <div className="flex gap-4">
                            <Button
                                size="lg"
                                color="danger"
                                variant="flat"
                                onClick={() => setDrawnPath([])}
                                className="w-1/3 font-bold"
                            >
                                Clear
                            </Button>
                            <Button
                                size="lg"
                                color="success"
                                onClick={handleSubmitDrawing}
                                className="w-2/3 font-black"
                            >
                                SUBMIT DRAWING
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {detected && intersectionData && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl">
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        Detection Results
                    </div>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                        <div>Draw Area: {(computeFormattedArea(drawnPath)).toFixed(4)}</div>
                        <div>Actual Area: {(intersectionData.intersection_area || 0).toFixed(4)}</div>
                        <div className="font-bold text-blue-600">
                            (Detailed scoring computed by backend)
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to compute area on frontend for immediate feedback (Show off)
function computeFormattedArea(points: Array<{ x: number, y: number }>) {
    // simple shoelace
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        area += (points[i].x * points[(i + 1) % n].y - points[(i + 1) % n].x * points[i].y);
    }
    return Math.abs(area / 2);
}

