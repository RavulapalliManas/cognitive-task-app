"use client";

import React, { useState, useEffect } from "react";
import { Button, Slider } from "@heroui/react";
import { motion } from "framer-motion";

interface Shape {
    name: string;
    label: string;
    points: Array<{x: number, y: number}>;
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
    startTime
}: RecognitionCanvasProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [confidence, setConfidence] = useState<number>(3);
    const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
    const [submitted, setSubmitted] = useState(false);

    const SVG_WIDTH = 400;
    const SVG_HEIGHT = 300;
    const POINT_RADIUS = 3;

    // Countdown timer
    useEffect(() => {
        if (startTime && !submitted) {
            const interval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const remaining = Math.max(0, timeLimitSeconds - elapsed);
                setTimeRemaining(remaining);

                if (remaining === 0 && selectedIndex !== null) {
                    handleSubmit();
                }
            }, 100);

            return () => clearInterval(interval);
        }
    }, [startTime, submitted, timeLimitSeconds, selectedIndex]);

    const handleSubmit = () => {
        if (selectedIndex !== null && !submitted) {
            setSubmitted(true);
            onSubmit(selectedIndex, confidence);
        }
    };

    const renderShape = (shape: Shape, index: number) => {
        const isSelected = selectedIndex === index;
        const isHovered = false; // Can add hover state if needed

        return (
            <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative cursor-pointer rounded-2xl p-4 border-4 transition-all ${
                    isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400'
                }`}
                onClick={() => !submitted && setSelectedIndex(index)}
            >
                <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className="mx-auto"
                >
                    {/* Render point cloud */}
                    {shape.points.map((point, pidx) => {
                        const x = point.x * SVG_WIDTH;
                        const y = point.y * SVG_HEIGHT;

                        return (
                            <circle
                                key={pidx}
                                cx={x}
                                cy={y}
                                r={POINT_RADIUS}
                                fill={isSelected ? "#2563eb" : "#6b7280"}
                                opacity={0.8}
                            />
                        );
                    })}
                </svg>

                {/* Selection indicator */}
                {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ✓ Selected
                    </div>
                )}

                {/* Shape label (optional, can be hidden for difficulty) */}
                <div className="text-center mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Shape {String.fromCharCode(65 + index)}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="w-full">
            {/* Timer */}
            <div className="mb-6 text-center">
                <div className={`text-4xl font-black ${
                    timeRemaining < 10 ? 'text-red-600 animate-pulse' : 'text-blue-600'
                }`}>
                    ⏱️ {Math.ceil(timeRemaining)}s
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                    Select the shape you saw before
                </div>
            </div>

            {/* Shapes grid */}
            <div className={`grid ${
                shapes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            } gap-6 mb-6`}>
                {shapes.map((shape, index) => renderShape(shape, index))}
            </div>

            {/* Confidence slider */}
            <div className="mb-6 bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl">
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    How confident are you?
                </div>
                <Slider
                    size="lg"
                    step={1}
                    minValue={1}
                    maxValue={5}
                    value={confidence}
                    onChange={(value) => setConfidence(value as number)}
                    className="mb-4"
                    marks={[
                        {value: 1, label: "Not Sure"},
                        {value: 3, label: "Moderate"},
                        {value: 5, label: "Very Sure"}
                    ]}
                    color="primary"
                    showTooltip={false}
                    disabled={submitted}
                />
                <div className="text-center text-2xl font-bold text-blue-600">
                    {"⭐".repeat(confidence)}
                </div>
            </div>

            {/* Submit button */}
            <Button
                size="lg"
                color="primary"
                variant="shadow"
                onClick={handleSubmit}
                disabled={selectedIndex === null || submitted}
                className="w-full text-2xl py-8 font-black rounded-2xl"
            >
                {submitted ? "Submitted! ✓" : "Submit Answer"}
            </Button>

            {/* Help text */}
            {selectedIndex === null && !submitted && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                    Click on a shape to select it
                </div>
            )}
        </div>
    );
}
