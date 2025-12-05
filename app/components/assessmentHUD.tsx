"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button, Progress } from "@heroui/react";

interface AssessmentHUDProps {
    currentLevel: number;
    maxLevels: number;
    currentSublevel: number;
    sublevelsPerLevel: number;
    levelName: string;
    currentLevelElapsedTime: number;
    globalElapsedTime: number;
    progress: number;
    submissionsCount: number;
    totalTargets: number;
    mistakes: number;
    showUndo: boolean;
    onUndo: () => void;
    formatTime: (ms: number) => string;
}

export default function AssessmentHUD({
    currentLevel,
    maxLevels,
    currentSublevel,
    sublevelsPerLevel,
    levelName,
    currentLevelElapsedTime,
    globalElapsedTime,
    progress,
    submissionsCount,
    totalTargets,
    mistakes,
    showUndo,
    onUndo,
    formatTime,
}: AssessmentHUDProps) {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b-4 border-blue-500 shadow-xl">
            <div className="max-w-7xl mx-auto px-8 py-6">
                <div className="flex items-center justify-between gap-8">
                    {/* Level Info */}
                    <div className="flex items-center gap-4">
                        <div className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-2xl">
                            Level {currentLevel}/{maxLevels}
                        </div>
                        <div className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-2xl">
                            Part {currentSublevel}/{sublevelsPerLevel}
                        </div>
                        <div className="px-6 py-3 bg-purple-600 text-white rounded-2xl capitalize font-bold text-xl">
                            {levelName}
                        </div>
                    </div>

                    {/* Timers with Hourglass */}
                    <div className="flex items-center gap-6">
                        <motion.div
                            animate={{ rotate: [0, 180] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="text-5xl"
                        >
                            ⏳
                        </motion.div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="text-base font-bold text-gray-700 dark:text-gray-300 w-16">Level:</div>
                                <div className="font-mono text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                                    {formatTime(currentLevelElapsedTime)}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-base font-bold text-gray-700 dark:text-gray-300 w-16">Total:</div>
                                <div className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                    {formatTime(globalElapsedTime)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="flex-1 max-w-md">
                        <div className="flex flex-col gap-2">
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                Progress: {submissionsCount}/{totalTargets}
                            </div>
                            <Progress
                                value={progress}
                                className="h-3"
                                color="success"
                                size="lg"
                            />
                        </div>
                    </div>

                    {/* Mistakes */}
                    <div className="flex flex-col items-center gap-1 bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-2xl">
                        <div className="text-base font-bold text-gray-700 dark:text-gray-300">Mistakes</div>
                        <div
                            className={`text-4xl font-black ${mistakes > 0 ? "text-red-600" : "text-green-600"
                                }`}
                        >
                            {mistakes}
                        </div>
                    </div>

                    {/* Undo Button */}
                    {showUndo && (
                        <Button
                            size="lg"
                            color="warning"
                            variant="shadow"
                            onClick={onUndo}
                            isDisabled={submissionsCount === 0}
                            className="px-6 py-3 text-xl font-bold"
                        >
                            ↶ Undo
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
