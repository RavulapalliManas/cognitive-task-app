"use client";
import { useState, useEffect } from "react";
import AssessmentCanvas from "./canvas";
import { useAssessment } from "./useassessment";
import { Button, Card, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

type TestPhase = "intro" | "level1" | "level2" | "level3" | "completed";

export default function AssessmentPage() {
    const {
        points,
        currentLevel,
        currentSublevel,
        testType,
        start,
        recordClick,
        finish,
        startTime,
        mistakes,
        submissions,
        trueOrder,
        driftParameters,
        highlightSchedule,
    } = useAssessment();

    const [phase, setPhase] = useState<TestPhase>("intro");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showNextCountdown, setShowNextCountdown] = useState(false);
    const [nextTestIn, setNextTestIn] = useState(20);

    // Time tracking
    useEffect(() => {
        if (startTime && phase !== "completed") {
            const interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [startTime, phase]);

    // Memory test countdown
    useEffect(() => {
        if (testType === "memory" && showNextCountdown) {
            const interval = setInterval(() => {
                setNextTestIn(prev => {
                    if (prev <= 1) {
                        setShowNextCountdown(false);
                        return 20;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [testType, showNextCountdown]);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
    };

    const startLevel = async (level: number, type: "basic" | "memory" | "attention") => {
        setPhase(`level${level}` as TestPhase);
        await start(level, 1, type);
    };

    const handleFinish = async () => {
        const result = await finish();
        setPhase("completed");
        console.log("Assessment result:", result);
    };

    const progress = submissions.length / (trueOrder.length || 1) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900">
            {/* HUD - Always visible during test */}
            <AnimatePresence>
                {phase !== "intro" && phase !== "completed" && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-lg"
                    >
                        <div className="max-w-7xl mx-auto px-6 py-4">
                            <div className="flex items-center justify-between gap-6">
                                {/* Level Info */}
                                <div className="flex items-center gap-4">
                                    <div className="px-4 py-2 bg-blue-500 text-white rounded-full font-bold">
                                        Level {currentLevel}
                                    </div>
                                    <div className="px-4 py-2 bg-purple-500 text-white rounded-full capitalize">
                                        {testType}
                                    </div>
                                </div>

                                {/* Timer */}
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Time:</div>
                                    <div className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                        {formatTime(elapsedTime)}
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="flex-1 max-w-md">
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            Progress: {submissions.length}/{trueOrder.length}
                                        </div>
                                        <Progress 
                                            value={progress} 
                                            className="flex-1"
                                            color="primary"
                                            size="md"
                                        />
                                    </div>
                                </div>

                                {/* Mistakes */}
                                <div className="flex items-center gap-2">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Mistakes:</div>
                                    <div className={`text-2xl font-bold ${mistakes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {mistakes}
                                    </div>
                                </div>

                                {/* Finish Button */}
                                <Button
                                    color="success"
                                    variant="shadow"
                                    size="lg"
                                    onClick={handleFinish}
                                    className="font-bold"
                                >
                                    Finish Test
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Memory Countdown Notification */}
            <AnimatePresence>
                {showNextCountdown && testType === "memory" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed top-24 right-6 z-50 bg-yellow-500 text-white px-6 py-4 rounded-2xl shadow-2xl"
                    >
                        <div className="text-lg font-bold">Next flash in {nextTestIn}s</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`${phase !== "intro" && phase !== "completed" ? "pt-24" : ""} px-6 py-8`}>
                {/* Intro Screen */}
                {phase === "intro" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-4xl mx-auto"
                    >
                        <Card className="p-12 bg-white dark:bg-gray-800 shadow-2xl">
                            <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Cognitive Assessment
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 text-center">
                                Welcome! You'll complete three levels of tests measuring different cognitive abilities.
                            </p>

                            <div className="space-y-6 mb-8">
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                    <h3 className="text-2xl font-bold mb-3 text-blue-600 dark:text-blue-400">Level 1: Basic</h3>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        Connect the numbered points in order to form a polygon. Click each point in sequence.
                                    </p>
                                </div>

                                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                                    <h3 className="text-2xl font-bold mb-3 text-purple-600 dark:text-purple-400">Level 2: Memory</h3>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        Some labels will be hidden. Flash indicators will show which point to memorize. Remember the sequence!
                                    </p>
                                </div>

                                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                                    <h3 className="text-2xl font-bold mb-3 text-indigo-600 dark:text-indigo-400">Level 3: Attention</h3>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        Points will drift subtly and flash to grab your attention. Stay focused on the correct sequence!
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <Button
                                    color="primary"
                                    size="lg"
                                    variant="shadow"
                                    onClick={() => startLevel(1, "basic")}
                                    className="text-xl py-8 font-bold"
                                >
                                    Start Level 1
                                </Button>
                                <Button
                                    color="secondary"
                                    size="lg"
                                    variant="shadow"
                                    onClick={() => startLevel(2, "memory")}
                                    className="text-xl py-8 font-bold"
                                >
                                    Start Level 2
                                </Button>
                                <Button
                                    color="success"
                                    size="lg"
                                    variant="shadow"
                                    onClick={() => startLevel(3, "attention")}
                                    className="text-xl py-8 font-bold"
                                >
                                    Start Level 3
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Test Canvas */}
                {phase !== "intro" && phase !== "completed" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-7xl mx-auto"
                    >
                        <Card className="p-8 bg-white dark:bg-gray-800 shadow-2xl">
                            <AssessmentCanvas
                                points={points}
                                onClickPoint={recordClick}
                                testType={testType}
                                driftParameters={driftParameters}
                                highlightSchedule={highlightSchedule}
                                startTime={startTime}
                                submissions={submissions}
                                trueOrder={trueOrder}
                                mistakes={mistakes}
                                onNextCountdown={(show) => setShowNextCountdown(show)}
                            />
                        </Card>
                    </motion.div>
                )}

                {/* Completion Screen */}
                {phase === "completed" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-4xl mx-auto"
                    >
                        <Card className="p-12 bg-white dark:bg-gray-800 shadow-2xl text-center">
                            <div className="text-6xl mb-6">🎉</div>
                            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                Assessment Complete!
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                                Great job! Your results are being processed.
                            </p>
                            <Button
                                color="primary"
                                size="lg"
                                variant="shadow"
                                onClick={() => window.location.href = "/results"}
                                className="text-xl py-6 px-12 font-bold"
                            >
                                View Results
                            </Button>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
