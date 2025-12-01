"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

interface ReconstructionCanvasProps {
    targetPolygon: Array<{x: number, y: number}>;
    displayTimeMs: number;
    onComplete: (userPolygon: Array<{x: number, y: number}>, timeTaken: number) => void;
    startTime: number | null;
}

export default function ReconstructionCanvas({
    targetPolygon,
    displayTimeMs,
    onComplete,
    startTime
}: ReconstructionCanvasProps) {
    const [phase, setPhase] = useState<"memorize" | "reconstruct" | "complete">("memorize");
    const [timeLeft, setTimeLeft] = useState(displayTimeMs / 1000);
    const [userPoints, setUserPoints] = useState<Array<{x: number, y: number}>>([]);
    const [reconstructionStartTime, setReconstructionStartTime] = useState<number | null>(null);

    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;
    const POINT_RADIUS = 12;
    const TARGET_POINT_RADIUS = 18;

    // Memorization countdown
    useEffect(() => {
        if (phase === "memorize" && startTime) {
            const interval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const remaining = Math.max(0, displayTimeMs / 1000 - elapsed);
                setTimeLeft(remaining);

                if (remaining === 0) {
                    setPhase("reconstruct");
                    setReconstructionStartTime(Date.now());
                }
            }, 100);

            return () => clearInterval(interval);
        }
    }, [phase, startTime, displayTimeMs]);

    const handleCanvasClick = (event: React.MouseEvent<SVGSVGElement>) => {
        if (phase !== "reconstruct") return;

        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        
        // Get click position relative to SVG
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        // Add point
        setUserPoints([...userPoints, { x, y }]);
    };

    const handleUndo = () => {
        if (userPoints.length > 0) {
            setUserPoints(userPoints.slice(0, -1));
        }
    };

    const handleComplete = () => {
        if (userPoints.length < 3) {
            alert("Please place at least 3 points to form a polygon");
            return;
        }

        const timeTaken = reconstructionStartTime ? Date.now() - reconstructionStartTime : 0;
        setPhase("complete");
        onComplete(userPoints, timeTaken);
    };

    const renderTargetPolygon = () => {
        const svgPoints = targetPolygon.map(p => ({
            x: p.x * SVG_WIDTH,
            y: p.y * SVG_HEIGHT
        }));

        const pathData = svgPoints.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';

        return (
            <>
                {/* Polygon outline */}
                <path
                    d={pathData}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3b82f6"
                    strokeWidth={4}
                />

                {/* Vertices */}
                {svgPoints.map((p, i) => (
                    <g key={i}>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r={TARGET_POINT_RADIUS}
                            fill="#3b82f6"
                            stroke="white"
                            strokeWidth={3}
                        />
                        <text
                            x={p.x}
                            y={p.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="16px"
                            fontWeight="bold"
                            fill="white"
                        >
                            {i + 1}
                        </text>
                    </g>
                ))}
            </>
        );
    };

    const renderUserPolygon = () => {
        if (userPoints.length === 0) return null;

        const svgPoints = userPoints.map(p => ({
            x: p.x * SVG_WIDTH,
            y: p.y * SVG_HEIGHT
        }));

        const pathData = svgPoints.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + (userPoints.length >= 3 ? ' Z' : '');

        return (
            <>
                {/* Lines */}
                <path
                    d={pathData}
                    fill={userPoints.length >= 3 ? "rgba(34, 197, 94, 0.2)" : "none"}
                    stroke="#22c55e"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* User points */}
                {svgPoints.map((p, i) => (
                    <motion.g
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r={POINT_RADIUS}
                            fill="#22c55e"
                            stroke="white"
                            strokeWidth={2}
                        />
                        <text
                            x={p.x}
                            y={p.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="12px"
                            fontWeight="bold"
                            fill="white"
                        >
                            {i + 1}
                        </text>
                    </motion.g>
                ))}
            </>
        );
    };

    const renderComparison = () => {
        return (
            <>
                {/* Target (blue, faded) */}
                {renderTargetPolygon()}
                
                {/* User (green, solid) */}
                {renderUserPolygon()}
            </>
        );
    };

    return (
        <div className="w-full">
            {/* Phase indicator */}
            <AnimatePresence mode="wait">
                {phase === "memorize" && (
                    <motion.div
                        key="memorize"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-6 bg-blue-100 dark:bg-blue-900/40 p-8 rounded-3xl border-4 border-blue-500"
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-4">👁️</div>
                            <div className="text-3xl font-black text-blue-700 dark:text-blue-300 mb-2">
                                Memorize This Shape
                            </div>
                            <div className="text-6xl font-black text-blue-600 mb-2">
                                {Math.ceil(timeLeft)}s
                            </div>
                            <div className="text-xl text-gray-700 dark:text-gray-300">
                                Try to remember the shape and vertex positions
                            </div>
                        </div>
                    </motion.div>
                )}

                {phase === "reconstruct" && (
                    <motion.div
                        key="reconstruct"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-6 bg-green-100 dark:bg-green-900/40 p-6 rounded-3xl border-4 border-green-500"
                    >
                        <div className="text-center">
                            <div className="text-4xl mb-2">✏️</div>
                            <div className="text-2xl font-black text-green-700 dark:text-green-300 mb-2">
                                Reconstruct the Shape
                            </div>
                            <div className="text-lg text-gray-700 dark:text-gray-300">
                                Click on the canvas to place vertices ({userPoints.length} placed)
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Canvas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6">
                <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className={`mx-auto bg-gray-50 dark:bg-gray-900 rounded-xl ${
                        phase === "reconstruct" ? "cursor-crosshair" : ""
                    }`}
                    style={{ maxWidth: "100%", height: "auto" }}
                    onClick={handleCanvasClick}
                >
                    {phase === "memorize" && renderTargetPolygon()}
                    {phase === "reconstruct" && renderUserPolygon()}
                    {phase === "complete" && renderComparison()}
                </svg>
            </div>

            {/* Controls */}
            {phase === "reconstruct" && (
                <div className="flex gap-4">
                    <Button
                        size="lg"
                        color="warning"
                        variant="flat"
                        onClick={handleUndo}
                        disabled={userPoints.length === 0}
                        className="flex-1 text-xl py-6 font-bold rounded-2xl"
                    >
                        ↶ Undo Last Point
                    </Button>

                    <Button
                        size="lg"
                        color="success"
                        variant="shadow"
                        onClick={handleComplete}
                        disabled={userPoints.length < 3}
                        className="flex-1 text-xl py-6 font-bold rounded-2xl"
                    >
                        ✓ Complete Polygon
                    </Button>
                </div>
            )}

            {phase === "reconstruct" && (
                <div className="mt-4 text-center text-gray-600 dark:text-gray-400">
                    {userPoints.length === 0 && "Click anywhere on the canvas to start placing vertices"}
                    {userPoints.length > 0 && userPoints.length < 3 && "Place at least 3 vertices to form a polygon"}
                    {userPoints.length >= 3 && "Click 'Complete Polygon' when you're done, or keep adding more points"}
                </div>
            )}

            {phase === "complete" && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl">
                    <div className="text-center">
                        <div className="text-4xl mb-3">🎯</div>
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                            Reconstruction Complete!
                        </div>
                        <div className="text-lg text-gray-700 dark:text-gray-300">
                            Blue = Target Shape | Green = Your Shape
                        </div>
                        <div className="text-md text-gray-600 dark:text-gray-400 mt-2">
                            Your polygon: {userPoints.length} vertices | Target: {targetPolygon.length} vertices
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
