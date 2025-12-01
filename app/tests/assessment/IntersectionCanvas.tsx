"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { computeIntersection } from "@/lib/backend";

interface PolygonData {
    points: Array<{x: number, y: number}>;
    velocity: {dx: number, dy: number};
}

interface IntersectionCanvasProps {
    polygonA: PolygonData;
    polygonB: PolygonData;
    thresholdPercentage: number;
    animationDurationMs: number;
    onDetection: (detectionTime: number, actualIntersectionTime: number, actualArea: number) => void;
    startTime: number | null;
}

export default function IntersectionCanvas({
    polygonA,
    polygonB,
    thresholdPercentage,
    animationDurationMs,
    onDetection,
    startTime
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

    // Check for intersection continuously
    useEffect(() => {
        if (animationActive && startTime && !actualIntersectionTime) {
            checkIntersection();
        }
    }, [currentPosA, currentPosB, animationActive]);

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
                const intersectTime = Date.now() - startTime;
                setActualIntersectionTime(intersectTime);
            }
        } catch (error) {
            console.error("Intersection computation failed:", error);
        }
    };

    const handleDetect = async () => {
        if (detected || !startTime) return;

        setDetected(true);
        setAnimationActive(false);

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        // Get final intersection data
        const result = await computeIntersection(currentPosA, currentPosB);
        setIntersectionData(result);

        const detectionTime = Date.now() - startTime;
        const actualTime = actualIntersectionTime || detectionTime;

        onDetection(detectionTime, actualTime, result.intersection_area);
    };

    const toSVGCoords = (points: Array<{x: number, y: number}>) => {
        return points.map(p => ({
            x: p.x * SVG_WIDTH,
            y: p.y * SVG_HEIGHT
        }));
    };

    const renderPolygon = (points: Array<{x: number, y: number}>, color: string, label: string) => {
        const svgPoints = toSVGCoords(points);
        const pathData = svgPoints.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';

        return (
            <>
                <path
                    d={pathData}
                    fill={color}
                    fillOpacity={0.3}
                    stroke={color}
                    strokeWidth={3}
                />
                <text
                    x={svgPoints[0].x}
                    y={svgPoints[0].y - 10}
                    fontSize="20"
                    fontWeight="bold"
                    fill={color}
                >
                    {label}
                </text>
            </>
        );
    };

    const renderIntersection = () => {
        if (!intersectionData?.intersection_polygon) return null;

        const svgPoints = toSVGCoords(intersectionData.intersection_polygon);
        const pathData = svgPoints.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';

        return (
            <path
                d={pathData}
                fill="#10b981"
                fillOpacity={0.6}
                stroke="#10b981"
                strokeWidth={4}
            />
        );
    };

    const progressPercentage = intersectionData?.intersection_percentage || 0;
    const thresholdMet = progressPercentage >= thresholdPercentage;

    return (
        <div className="w-full">
            {/* Status bar */}
            <div className="mb-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        Intersection Progress
                    </div>
                    <div className={`text-3xl font-black ${
                        thresholdMet ? 'text-green-600 animate-pulse' : 'text-gray-600'
                    }`}>
                        {progressPercentage.toFixed(1)}%
                    </div>
                </div>

                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${
                            thresholdMet ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, progressPercentage)}%` }}
                    />
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                    Threshold: {thresholdPercentage.toFixed(1)}% 
                    {thresholdMet && " ✓ REACHED"}
                </div>
            </div>

            {/* Canvas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6">
                <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className="mx-auto bg-gray-50 dark:bg-gray-900 rounded-xl"
                    style={{ maxWidth: "100%", height: "auto" }}
                >
                    {/* Render polygons */}
                    {renderPolygon(currentPosA, "#3b82f6", "Polygon A")}
                    {renderPolygon(currentPosB, "#ef4444", "Polygon B")}
                    
                    {/* Render intersection area */}
                    {detected && renderIntersection()}
                </svg>
            </div>

            {/* Detection button */}
            <Button
                size="lg"
                color={thresholdMet ? "success" : "primary"}
                variant="shadow"
                onClick={handleDetect}
                disabled={detected}
                className="w-full text-2xl py-8 font-black rounded-2xl"
            >
                {detected ? "Detection Recorded! ✓" : "DETECT INTERSECTION NOW"}
            </Button>

            {/* Instructions */}
            {!detected && (
                <div className="text-center text-gray-600 dark:text-gray-400 mt-4 text-lg">
                    Press the button when the polygons overlap by {thresholdPercentage}% or more
                </div>
            )}

            {/* Results */}
            {detected && intersectionData && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl">
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        Detection Results
                    </div>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                        <div>Intersection Area: {intersectionData.intersection_area.toFixed(4)}</div>
                        <div>Intersection %: {intersectionData.intersection_percentage.toFixed(2)}%</div>
                        <div>Threshold: {thresholdPercentage}%</div>
                        <div className={thresholdMet ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {thresholdMet ? "✓ Threshold Met" : "✗ Below Threshold"}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
