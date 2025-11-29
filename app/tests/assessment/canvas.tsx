"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type PointType = {
    x: number;
    y: number;
    label?: string | null;
    index: number;
};

interface AssessmentCanvasProps {
    points: PointType[];
    onClickPoint: (pointIndex: number) => void;
    testType: "basic" | "memory" | "attention";
    driftParameters?: any;
    highlightSchedule?: any[];
    startTime: number | null;
    submissions: any[];
    trueOrder: number[];
    mistakes: number;
    onNextCountdown?: (show: boolean) => void;
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
    mistakes,
    onNextCountdown
}: AssessmentCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [clickedPoints, setClickedPoints] = useState<Set<number>>(new Set());
    const [wrongClick, setWrongClick] = useState<number | null>(null);
    const [flashingPoints, setFlashingPoints] = useState<Set<number>>(new Set());
    const [nextFlashTime, setNextFlashTime] = useState<number | null>(null);
    
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 800;
    const POINT_RADIUS = 18;
    const HOVER_RADIUS = 24;
    const PADDING = 60; // Padding to keep points away from canvas edges

    // Track clicked points
    useEffect(() => {
        const clicked = new Set(submissions.map(s => s.selected_index));
        setClickedPoints(clicked);
    }, [submissions]);

    // Handle flashing for memory test
    useEffect(() => {
        if (testType === "memory" && highlightSchedule.length > 0 && startTime) {
            const checkFlashes = () => {
                const elapsed = Date.now() - startTime;
                const newFlashing = new Set<number>();
                let nextFlash: number | null = null;

                highlightSchedule.forEach(event => {
                    const eventStart = event.start_ms;
                    const eventEnd = event.start_ms + event.duration_ms;

                    if (elapsed >= eventStart && elapsed <= eventEnd) {
                        newFlashing.add(event.index);
                    } else if (eventStart > elapsed) {
                        if (nextFlash === null || eventStart < nextFlash) {
                            nextFlash = eventStart;
                        }
                    }
                });

                setFlashingPoints(newFlashing);
                
                // Show countdown if next flash is within 20 seconds
                if (nextFlash !== null) {
                    const secondsUntilNext = Math.floor((nextFlash - elapsed) / 1000);
                    if (secondsUntilNext <= 20 && secondsUntilNext > 0) {
                        onNextCountdown?.(true);
                    } else {
                        onNextCountdown?.(false);
                    }
                    setNextFlashTime(nextFlash);
                } else {
                    onNextCountdown?.(false);
                    setNextFlashTime(null);
                }
            };

            const interval = setInterval(checkFlashes, 50); // Check at 20fps for smooth flash detection
            return () => clearInterval(interval);
        }
    }, [testType, highlightSchedule, startTime, onNextCountdown]);

    // Calculate drift offset for attention test
    const getDriftOffset = useCallback((pointIndex: number, baseX: number, baseY: number, currentTime: number): [number, number] => {
        if (testType !== "attention" || !driftParameters || !startTime) {
            return [0, 0];
        }

        // Check if this specific point should drift
        const driftingIndices = driftParameters.driftingIndices || [];
        if (!driftingIndices.includes(pointIndex)) {
            return [0, 0];
        }

        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        const { amplitude, frequency } = driftParameters;
        
        // Use sine waves with different phases for x and y to create circular drift
        const offsetX = Math.sin(elapsed * frequency * Math.PI * 2) * amplitude * CANVAS_WIDTH;
        const offsetY = Math.cos(elapsed * frequency * Math.PI * 2 * 1.3) * amplitude * CANVAS_HEIGHT;
        
        return [offsetX, offsetY];
    }, [testType, driftParameters, startTime, CANVAS_WIDTH, CANVAS_HEIGHT]);

    // High-performance rendering loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        // Enable hardware acceleration hints
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const render = (timestamp: number) => {
            // Clear canvas with background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw connection lines for completed sequence
            if (submissions.length > 1) {
                ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                
                for (let i = 0; i < submissions.length - 1; i++) {
                    const fromIndex = submissions[i].selected_index;
                    const toIndex = submissions[i + 1].selected_index;
                    const fromPoint = points.find(p => p.index === fromIndex);
                    const toPoint = points.find(p => p.index === toIndex);
                    
                    if (fromPoint && toPoint) {
                        const [fromDriftX, fromDriftY] = getDriftOffset(fromIndex, fromPoint.x, fromPoint.y, timestamp);
                        const [toDriftX, toDriftY] = getDriftOffset(toIndex, toPoint.x, toPoint.y, timestamp);
                        
                        const fromX = PADDING + fromPoint.x * (CANVAS_WIDTH - 2 * PADDING) + fromDriftX;
                        const fromY = PADDING + fromPoint.y * (CANVAS_HEIGHT - 2 * PADDING) + fromDriftY;
                        const toX = PADDING + toPoint.x * (CANVAS_WIDTH - 2 * PADDING) + toDriftX;
                        const toY = PADDING + toPoint.y * (CANVAS_HEIGHT - 2 * PADDING) + toDriftY;
                        
                        if (i === 0) {
                            ctx.moveTo(fromX, fromY);
                        }
                        ctx.lineTo(toX, toY);
                    }
                }
                
                // Close the polygon if all points are clicked
                if (submissions.length === trueOrder.length) {
                    const lastIndex = submissions[submissions.length - 1].selected_index;
                    const firstIndex = submissions[0].selected_index;
                    const lastPoint = points.find(p => p.index === lastIndex);
                    const firstPoint = points.find(p => p.index === firstIndex);
                    
                    if (lastPoint && firstPoint) {
                        const [lastDriftX, lastDriftY] = getDriftOffset(lastIndex, lastPoint.x, lastPoint.y, timestamp);
                        const [firstDriftX, firstDriftY] = getDriftOffset(firstIndex, firstPoint.x, firstPoint.y, timestamp);
                        
                        const lastX = PADDING + lastPoint.x * (CANVAS_WIDTH - 2 * PADDING) + lastDriftX;
                        const lastY = PADDING + lastPoint.y * (CANVAS_HEIGHT - 2 * PADDING) + lastDriftY;
                        const firstX = PADDING + firstPoint.x * (CANVAS_WIDTH - 2 * PADDING) + firstDriftX;
                        const firstY = PADDING + firstPoint.y * (CANVAS_HEIGHT - 2 * PADDING) + firstDriftY;
                        
                        ctx.lineTo(firstX, firstY);
                        ctx.strokeStyle = "rgba(34, 197, 94, 0.7)"; // Green for closing line
                        ctx.lineWidth = 4;
                    }
                }
                
                ctx.stroke();
            }

            // Draw points
            points.forEach((point, idx) => {
                const [driftX, driftY] = getDriftOffset(point.index, point.x, point.y, timestamp);
                // Add padding to keep points within canvas bounds
                const x = PADDING + point.x * (CANVAS_WIDTH - 2 * PADDING) + driftX;
                const y = PADDING + point.y * (CANVAS_HEIGHT - 2 * PADDING) + driftY;
                
                const isClicked = clickedPoints.has(point.index);
                const isHovered = hoveredPoint === point.index;
                const isFlashing = flashingPoints.has(point.index);
                const isWrong = wrongClick === point.index;
                const isNext = !isClicked && submissions.length < trueOrder.length && 
                trueOrder[submissions.length] === point.index;

                // Determine radius and colors
                let radius = POINT_RADIUS;
                let fillColor = "#ffffff";
                let strokeColor = "#1f2937";
                let strokeWidth = 2;

                if (isWrong) {
                    // Wrong click - flash red
                    radius = HOVER_RADIUS;
                    fillColor = "#ef4444";
                    strokeColor = "#dc2626";
                    strokeWidth = 4;
                } else if (isFlashing) {
                    // Memory flash - bright yellow/gold pulsing
                    const flashIntensity = Math.sin(timestamp * 0.015) * 0.3 + 0.7;
                    radius = POINT_RADIUS + 4 * flashIntensity;
                    fillColor = `rgba(250, 204, 21, ${flashIntensity})`;
                    strokeColor = "#f59e0b";
                    strokeWidth = 4;
                    
                    // Add glow effect
                    ctx.shadowBlur = 20 * flashIntensity;
                    ctx.shadowColor = "#fbbf24";
                } else if (isClicked) {
                    // Already clicked - green
                    fillColor = "#10b981";
                    strokeColor = "#059669";
                    strokeWidth = 3;
                } else if (isNext) {
                    // Next expected point - pulse blue
                    const pulse = Math.sin(timestamp * 0.01) * 0.2 + 0.8;
                    radius = POINT_RADIUS + 2 * pulse;
                    fillColor = "#3b82f6";
                    strokeColor = "#2563eb";
                    strokeWidth = 3;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = "#3b82f6";
                } else if (isHovered) {
                    radius = HOVER_RADIUS;
                    fillColor = "#e0e7ff";
                    strokeColor = "#4f46e5";
                    strokeWidth = 3;
                }

                // Draw point circle
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.stroke();
                
                // Reset shadow
                ctx.shadowBlur = 0;

                // Draw label if exists and not hidden
                if (point.label) {
                    ctx.font = "bold 24px system-ui";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = isClicked ? "#ffffff" : "#1f2937";
                    ctx.fillText(point.label, x, y);
                } else if (testType === "memory" && !isClicked) {
                    // Show question mark for hidden labels
                    ctx.font = "bold 22px system-ui";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#9ca3af";
                    ctx.fillText("?", x, y);
                }

                // Draw sequence number for clicked points
                if (isClicked) {
                    const sequenceNum = submissions.findIndex(s => s.selected_index === point.index) + 1;
                    ctx.font = "bold 16px system-ui";
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.arc(x + radius - 2, y - radius + 2, 14, 0, Math.PI * 2);
                    ctx.fillStyle = "#1f2937";
                    ctx.fill();
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(sequenceNum.toString(), x + radius - 2, y - radius + 2);
                }
            });

            // Continue animation loop
            animationFrameRef.current = requestAnimationFrame(render);
        };

        animationFrameRef.current = requestAnimationFrame(render);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [points, hoveredPoint, clickedPoints, flashingPoints, wrongClick, submissions, trueOrder, testType, getDriftOffset]);

    // Handle mouse move for hover effects
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

        let found: number | null = null;
        const currentTime = performance.now();

        for (const point of points) {
            const [driftX, driftY] = getDriftOffset(point.index, point.x, point.y, currentTime);
            const px = PADDING + point.x * (CANVAS_WIDTH - 2 * PADDING) + driftX;
            const py = PADDING + point.y * (CANVAS_HEIGHT - 2 * PADDING) + driftY;
            const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

            if (dist <= HOVER_RADIUS) {
                found = point.index;
                break;
            }
        }

        setHoveredPoint(found);
    }, [points, getDriftOffset]);

    // Handle click
    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

        const currentTime = performance.now();

        for (const point of points) {
            const [driftX, driftY] = getDriftOffset(point.index, point.x, point.y, currentTime);
            const px = PADDING + point.x * (CANVAS_WIDTH - 2 * PADDING) + driftX;
            const py = PADDING + point.y * (CANVAS_HEIGHT - 2 * PADDING) + driftY;
            const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

            if (dist <= HOVER_RADIUS) {
                // Check if this is the correct next point
                const expectedIndex = trueOrder[submissions.length];
                const isCorrect = point.index === expectedIndex;

                if (!isCorrect && !clickedPoints.has(point.index)) {
                    // Show error feedback
                    setWrongClick(point.index);
                    setTimeout(() => setWrongClick(null), 500);
                }

                onClickPoint(point.index);
                break;
            }
        }
    }, [points, onClickPoint, getDriftOffset, trueOrder, submissions, clickedPoints]);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onMouseMove={handleMouseMove}
                    onClick={handleClick}
                    className="border-4 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl cursor-pointer"
                    style={{
                        width: "100%",
                        maxWidth: `${CANVAS_WIDTH}px`,
                        height: "auto",
                        imageRendering: "crisp-edges",
                        willChange: "transform",
                    }}
                />
                
                {/* Instructions overlay */}
                <AnimatePresence>
                    {submissions.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg font-bold text-lg z-10"
                        >
                            Click the points in sequence to connect them!
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Test-specific hints */}
            <div className="text-center text-gray-600 dark:text-gray-400">
                {testType === "memory" && (
                    <p className="text-lg">
                        💡 Watch for <span className="text-yellow-500 font-bold">flashing points</span> to help you remember the sequence!
                    </p>
                )}
                {testType === "attention" && (
                    <p className="text-lg">
                        💡 Stay focused! Points will <span className="text-purple-500 font-bold">drift and flash</span> to test your attention.
                    </p>
                )}
            </div>
        </div>
    );
}
