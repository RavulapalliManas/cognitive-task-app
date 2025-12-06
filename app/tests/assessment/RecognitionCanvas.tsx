"use client";

import React, { useState, useEffect } from "react";
import { Button, Slider } from "@heroui/react";
import { motion } from "framer-motion";

interface Shape {
    name: string;
    label: string;
    points: Array<{ x: number, y: number }>;
    is_target: boolean;
}

interface RecognitionCanvasProps {
    shapes: Shape[];
    onSubmit: (selectedIndex: number, confidence: number) => void;
    timeLimitSeconds: number;
    startTime: number | null;
}

export default function RecognitionCanvas({
    shapes,
    onSubmit,
    timeLimitSeconds,
    startTime,
    targetImageUrl // Added prop
}: RecognitionCanvasProps & { targetImageUrl?: string }) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [confidence, setConfidence] = useState<number>(3);
    const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
    const [submitted, setSubmitted] = useState(false);

    const SVG_WIDTH = 300;
    const SVG_HEIGHT = 200;
    const POINT_RADIUS = 3;

    // Timer
    useEffect(() => {
        if (!submitted) {
            const interval = setInterval(() => {
                setTimeRemaining(prev => {
                    const next = Math.max(0, prev - 0.1);
                    if (next === 0 && selectedIndex !== null) {
                        handleSubmit();
                    }
                    return next;
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [submitted, selectedIndex]);

    const handleSubmit = () => {
        if (selectedIndex !== null && !submitted) {
            setSubmitted(true);
            onSubmit(selectedIndex, confidence);
        }
    };

    const renderShape = (shape: Shape, index: number) => {
        const isSelected = selectedIndex === index;
        return (
            <motion.div
                key={index}
                whileHover={!submitted ? { scale: 1.05 } : {}}
                whileTap={!submitted ? { scale: 0.95 } : {}}
                className={`relative rounded-2xl p-2 border-4 transition-all cursor-pointer bg-white dark:bg-gray-800
                    ${isSelected
                        ? 'border-blue-600 shadow-xl'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                onClick={() => !submitted && setSelectedIndex(index)}
            >
                <svg
                    width="100%"
                    height={SVG_HEIGHT}
                    viewBox={`0 0 400 300`} // Fixed generic viewbox for scaling
                    className="mx-auto"
                >
                    {shape.points.map((point, pidx) => (
                        <circle
                            key={pidx}
                            cx={point.x * 400}
                            cy={point.y * 300}
                            r={POINT_RADIUS}
                            fill={isSelected ? "#2563eb" : "#6b7280"}
                            opacity={0.8}
                        />
                    ))}
                </svg>
                {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">✓</div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Match the Shape</h2>
                <div className={`text-2xl font-bold ${timeRemaining < 10 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                    ⏱️ {Math.ceil(timeRemaining)}s
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
                {/* Left: Target Image */}
                {targetImageUrl && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border-2 border-dashed border-gray-300">
                        <h3 className="text-xl font-bold text-gray-500 mb-4 uppercase tracking-wider">Target Image</h3>
                        <img
                            src={`http://127.0.0.1:8000${targetImageUrl}`}
                            alt="Target"
                            className="max-w-full max-h-[300px] object-contain rounded-xl shadow-lg"
                        />
                    </div>
                )}

                {/* Right: Options */}
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-500 mb-4 text-center uppercase tracking-wider">Select Point Cloud</h3>
                    <div className={`grid ${shapes.length === 3 ? 'grid-cols-2 lg:grid-cols-2' : 'grid-cols-2'} gap-4`}>
                        {shapes.map((shape, index) => renderShape(shape, index))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-8 w-full max-w-2xl bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl">
                <div className="mb-6">
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confidence Level</div>
                    <Slider
                        size="md"
                        step={1}
                        minValue={1}
                        maxValue={5}
                        value={confidence}
                        onChange={(v) => setConfidence(v as number)}
                        marks={[{ value: 1, label: "?" }, { value: 5, label: "!!!" }]}
                        className="max-w-md mx-auto"
                        isDisabled={submitted}
                    />
                </div>

                <Button
                    size="lg"
                    color="primary"
                    variant="shadow"
                    onClick={handleSubmit}
                    isDisabled={selectedIndex === null || submitted}
                    className="w-full text-xl font-black rounded-2xl py-6"
                >
                    {submitted ? "Submitted" : "Confirm Match"}
                </Button>
            </div>
        </div>
    );
}
