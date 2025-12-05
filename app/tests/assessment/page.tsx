"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/userAuth";
import AssessmentCanvas from "./canvas";
import RecognitionCanvas from "./RecognitionCanvas";
import IntersectionCanvas from "./IntersectionCanvas";
import ReconstructionCanvas from "./ReconstructionCanvas";
import { useAssessment } from "./useassessment";
import { Button, Card, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import AssessmentHUD from "@/app/components/AssessmentHUD";

type TestPhase = "intro" | "countdown" | "testing" | "completed";
type LevelTimeData = {
    startTime: number;
    endTime: number | null;
    duration: number;
};

// Test configuration: 7 levels, 3 sublevels each
const MAX_LEVELS = 7;
const SUBLEVELS_PER_LEVEL = 3;

export default function AssessmentPage() {
    const router = useRouter();
    const {
        currentLevel, currentSublevel, testType, startTime, mistakes,
        points, trueOrder, submissions, driftParameters, highlightSchedule,
        recordClick, undoLastClick, start, finish,

        startLevel5, recognitionTask, submitRecognition,

        startLevel6, polygonA, polygonB, intersectionThreshold, animationDuration,
        recordIntersectionDetection, submitIntersection,

        startLevel7, targetPolygon, displayTimeMs, submitReconstruction
    } = useAssessment();

    const [phase, setPhase] = useState<TestPhase>("intro");
    const [countdown, setCountdown] = useState(2);
    const [showLevelTransition, setShowLevelTransition] = useState(false);
    const [showSublevelTransition, setShowSublevelTransition] = useState(false);
    const [nextLevelInfo, setNextLevelInfo] = useState<{ level: number, sublevel: number, type: string } | null>(null);
    const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
    const [globalElapsedTime, setGlobalElapsedTime] = useState(0);
    const [levelTimes, setLevelTimes] = useState<Record<string, LevelTimeData>>({});
    const [currentLevelStartTime, setCurrentLevelStartTime] = useState<number | null>(null);
    const [currentLevelElapsedTime, setCurrentLevelElapsedTime] = useState(0);

    // Prevent duplicate requests
    const isLoadingRef = useRef(false);
    const currentLevelRef = useRef<{ level: number, sublevel: number } | null>(null);

    // Check authentication
    useEffect(() => {
        if (!isLoggedIn()) {
            router.replace("/tests");
        }
    }, [router]);

    // Global time tracking (updates every 100ms)
    useEffect(() => {
        if (globalStartTime && phase === "testing") {
            const interval = setInterval(() => {
                setGlobalElapsedTime(Date.now() - globalStartTime);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [globalStartTime, phase]);

    // Current level time tracking (pause during transitions)
    useEffect(() => {
        if (currentLevelStartTime && phase === "testing") {
            const interval = setInterval(() => {
                setCurrentLevelElapsedTime(Date.now() - currentLevelStartTime);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [currentLevelStartTime, phase]);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
    };

    const getTestType = (level: number): "basic" | "memory" | "attention" | "combined" | "recognition" | "intersection" | "reconstruction" => {
        if (level === 1) return "basic";
        if (level === 2) return "memory";
        if (level === 3) return "attention";
        if (level === 4) return "combined"; // Combined: memory + attention
        if (level === 5) return "recognition";
        if (level === 6) return "intersection";
        if (level === 7) return "reconstruction";
        return "basic";
    };

    const getLevelName = (level: number): string => {
        if (level === 1) return "Basic Test";
        if (level === 2) return "Memory Test";
        if (level === 3) return "Attention Test";
        if (level === 4) return "Combined Test";
        if (level === 5) return "Shape Recognition";
        if (level === 6) return "Intersection Detection";
        if (level === 7) return "Memory Reconstruction";
        return "Test";
    };

    const startLevel = useCallback(async (level: number, sublevel: number) => {
        // Prevent duplicate requests
        if (isLoadingRef.current) {
            console.log('[BLOCKED] Already loading, ignoring duplicate request');
            return;
        }

        // Check if we're already on this level
        if (currentLevelRef.current?.level === level && currentLevelRef.current?.sublevel === sublevel) {
            console.log('[BLOCKED] Already on this level, ignoring duplicate');
            return;
        }

        console.log(`[START LEVEL] Level ${level}, Sublevel ${sublevel}`);
        isLoadingRef.current = true;
        currentLevelRef.current = { level, sublevel };

        try {
            setPhase("testing");
            setCurrentLevelStartTime(Date.now());
            const type = getTestType(level);

            // Route to appropriate start function based on level
            if (level <= 4) {
                // We know level <= 4 implies a base TestType
                await start(level, sublevel, type as any);
            } else if (level === 5) {
                await startLevel5(level, sublevel);
            } else if (level === 6) {
                await startLevel6(level, sublevel);
            } else if (level === 7) {
                await startLevel7(level, sublevel);
            }
        } finally {
            isLoadingRef.current = false;
        }
    }, [start, startLevel5, startLevel6, startLevel7]);

    // Countdown timer
    useEffect(() => {
        if (phase === "countdown" && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (phase === "countdown" && countdown === 0) {
            // Start appropriate level/sublevel after countdown
            if (!globalStartTime) {
                // First level, first sublevel
                setGlobalStartTime(Date.now());
                startLevel(1, 1);
            } else if (nextLevelInfo) {
                // Next level/sublevel
                startLevel(nextLevelInfo.level, nextLevelInfo.sublevel);
                setNextLevelInfo(null);
            }
        }
    }, [phase, countdown, globalStartTime, nextLevelInfo, startLevel]);

    const handleFinish = useCallback(async () => {
        // Record final level time
        if (currentLevelStartTime) {
            const endTime = Date.now();
            const key = `${currentLevel}-${currentSublevel}`;
            setLevelTimes(prev => ({
                ...prev,
                [key]: {
                    startTime: currentLevelStartTime,
                    endTime,
                    duration: endTime - currentLevelStartTime,
                }
            }));
        }

        const result = await finish();
        setPhase("completed");
        console.log("Assessment result:", result);
        console.log("Level times:", levelTimes);
        console.log("Total time:", globalElapsedTime);
    }, [currentLevel, currentSublevel, currentLevelStartTime, finish, setLevelTimes, setPhase, levelTimes, globalElapsedTime]);

    const handleNextLevel = useCallback(async () => {
        // Record current sublevel time
        if (currentLevelStartTime) {
            const endTime = Date.now();
            const key = `${currentLevel}-${currentSublevel}`;
            setLevelTimes(prev => ({
                ...prev,
                [key]: {
                    startTime: currentLevelStartTime,
                    endTime,
                    duration: endTime - currentLevelStartTime,
                }
            }));
        }

        const nextSublevel = currentSublevel + 1;
        const nextLevel = currentLevel;

        // Check if we need to advance to next level or next sublevel
        if (nextSublevel > SUBLEVELS_PER_LEVEL) {
            // Move to next level
            if (currentLevel >= MAX_LEVELS) {
                // Assessment complete
                handleFinish();
                return;
            }

            const newLevel = currentLevel + 1;
            setNextLevelInfo({
                level: newLevel,
                sublevel: 1,
                type: getLevelName(newLevel)
            });
            setShowLevelTransition(true);
            setTimeout(() => {
                setShowLevelTransition(false);
                // Reset loading state for next level
                isLoadingRef.current = false;
                currentLevelRef.current = null;
                setPhase("countdown");
                setCountdown(2);
            }, 2000); // Faster transition
        } else {
            // Move to next sublevel
            setNextLevelInfo({
                level: nextLevel,
                sublevel: nextSublevel,
                type: `${getLevelName(nextLevel)} - Part ${nextSublevel}`
            });
            setShowSublevelTransition(true);
            setTimeout(() => {
                setShowSublevelTransition(false);
                // Reset loading state for next sublevel
                isLoadingRef.current = false;
                currentLevelRef.current = null;
                setPhase("countdown");
                setCountdown(2);
            }, 1500); // Faster sublevel transition
        }
    }, [currentLevel, currentSublevel, currentLevelStartTime, setLevelTimes, setNextLevelInfo, setShowLevelTransition, setShowSublevelTransition, setPhase, setCountdown, handleFinish]);

    const handleBeginAssessment = () => {
        // Reset loading state when starting new assessment
        isLoadingRef.current = false;
        currentLevelRef.current = null;
        setPhase("countdown");
        setCountdown(2);
    };

    // Check if current level/sublevel is complete (for manual next button)
    const isLevelComplete = currentLevel <= 4 && trueOrder && submissions && submissions.length > 0 && submissions.length === trueOrder.length;

    const progress = (submissions && trueOrder) ? (submissions.length / (trueOrder.length || 1) * 100) : 0;

    const handleLevelComplete = useCallback((result: any) => {
        // You might want to log the result or show a specific success message here
        handleNextLevel();
    }, [handleNextLevel]);

    // Auto-advance for Levels 1-4 (Tracing Tasks)
    const hasSubmittedRef = useRef(false);

    // Reset submission guard when level/sublevel changes
    useEffect(() => {
        hasSubmittedRef.current = false;
    }, [currentLevel, currentSublevel]);

    useEffect(() => {
        if (currentLevel <= 4 && trueOrder && submissions && trueOrder.length > 0) {
            const isComplete = submissions.length === trueOrder.length;

            if (isComplete && !hasSubmittedRef.current) {
                hasSubmittedRef.current = true;
                const submitAndAdvance = async () => {
                    // Small delay to show the final connection
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const result = await finish();
                    if (result) {
                        handleLevelComplete(result);
                    }
                };
                submitAndAdvance();
            }
        }
    }, [currentLevel, trueOrder, submissions, finish, handleLevelComplete]);

    return (
        <div className="min-h-screen bg-gray-50 dark:from-gray-900">
            {/* Level Transition Overlay */}
            <AnimatePresence>
                {showLevelTransition && nextLevelInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <div className="text-white text-8xl mb-6">✅</div>
                            <h2 className="text-white text-6xl font-black mb-4">Level {nextLevelInfo.level - 1} Complete!</h2>
                            <p className="text-white text-3xl font-medium">Get ready for Level {nextLevelInfo.level}</p>
                            <p className="text-white/80 text-2xl mt-2 capitalize">{getLevelName(nextLevelInfo.level)}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sublevel Transition Overlay */}
            <AnimatePresence>
                {showSublevelTransition && nextLevelInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >
                            <div className="text-white text-7xl mb-4">🎯</div>
                            <h2 className="text-white text-5xl font-black mb-3">Part {nextLevelInfo.sublevel - 1} Complete!</h2>
                            <p className="text-white text-2xl font-medium">Next: Part {nextLevelInfo.sublevel}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Countdown Overlay */}
            <AnimatePresence>
                {phase === "countdown" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-white text-[20rem] font-black"
                        >
                            {countdown > 0 ? countdown : "GO!"}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HUD - Always visible during test */}
            <AnimatePresence>
                {phase === "testing" && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                    >
                        <AssessmentHUD
                            currentLevel={currentLevel}
                            maxLevels={MAX_LEVELS}
                            currentSublevel={currentSublevel}
                            sublevelsPerLevel={SUBLEVELS_PER_LEVEL}
                            levelName={getLevelName(currentLevel)}
                            currentLevelElapsedTime={currentLevelElapsedTime}
                            globalElapsedTime={globalElapsedTime}
                            progress={progress}
                            submissionsCount={submissions?.length || 0}
                            totalTargets={trueOrder?.length || 0}
                            mistakes={mistakes}
                            showUndo={currentLevel <= 4}
                            onUndo={undoLastClick}
                            formatTime={formatTime}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`${phase !== "intro" && phase !== "completed" && phase !== "countdown" && !showLevelTransition ? "pt-32" : ""} px-6 py-8`}>
                {/* Intro Screen */}
                {phase === "intro" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-5xl mx-auto"
                    >
                        <Card className="p-16 bg-white dark:bg-gray-800 shadow-2xl rounded-3xl">
                            <div className="text-center mb-12">
                                <div className="text-8xl mb-6">🧠</div>
                                <h1 className="text-7xl font-black mb-6 text-gray-900 dark:text-white">
                                    Cognitive Assessment
                                </h1>
                                <p className="text-3xl text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                    Complete 4 levels with 5 parts each<br />
                                    Take your time and do your best!
                                </p>
                            </div>

                            <div className="space-y-6 mb-12">
                                <div className="p-6 bg-blue-100 dark:bg-blue-900/40 rounded-3xl border-4 border-blue-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">1️⃣</div>
                                        <h3 className="text-3xl font-black text-blue-700 dark:text-blue-300">Level 1: Basic Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Click numbered dots in order. 5 parts with increasing complexity.
                                    </p>
                                </div>

                                <div className="p-6 bg-purple-100 dark:bg-purple-900/40 rounded-3xl border-4 border-purple-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">2️⃣</div>
                                        <h3 className="text-3xl font-black text-purple-700 dark:text-purple-300">Level 2: Memory Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Some numbers hidden. Watch yellow flashing dots to remember!
                                    </p>
                                </div>

                                <div className="p-6 bg-green-100 dark:bg-green-900/40 rounded-3xl border-4 border-green-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">3️⃣</div>
                                        <h3 className="text-3xl font-black text-green-700 dark:text-green-300">Level 3: Attention Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Dots drift around! Stay focused on moving targets.
                                    </p>
                                </div>

                                <div className="p-6 bg-orange-100 dark:bg-orange-900/40 rounded-3xl border-4 border-orange-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">4️⃣</div>
                                        <h3 className="text-3xl font-black text-orange-700 dark:text-orange-300">Level 4: Combined Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Memory + Attention together! Hidden numbers AND drifting dots.
                                    </p>
                                </div>

                                <div className="p-6 bg-pink-100 dark:bg-pink-900/40 rounded-3xl border-4 border-pink-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">5️⃣</div>
                                        <h3 className="text-3xl font-black text-pink-700 dark:text-pink-300">Level 5: Shape Recognition</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Identify shapes from point clouds. Rate your confidence!
                                    </p>
                                </div>

                                <div className="p-6 bg-cyan-100 dark:bg-cyan-900/40 rounded-3xl border-4 border-cyan-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">6️⃣</div>
                                        <h3 className="text-3xl font-black text-cyan-700 dark:text-cyan-300">Level 6: Intersection Detection</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Watch moving polygons and detect when they overlap!
                                    </p>
                                </div>

                                <div className="p-6 bg-rose-100 dark:bg-rose-900/40 rounded-3xl border-4 border-rose-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">7️⃣</div>
                                        <h3 className="text-3xl font-black text-rose-700 dark:text-rose-300">Level 7: Memory Reconstruction</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Memorize a shape, then recreate it from memory!
                                    </p>
                                </div>
                            </div>

                            <Button
                                color="primary"
                                size="lg"
                                variant="shadow"
                                onClick={handleBeginAssessment}
                                className="text-4xl py-12 font-black w-full rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-2xl"
                            >
                                Start Assessment
                            </Button>

                            <p className="text-center text-2xl text-gray-600 dark:text-gray-400 mt-8 font-medium">
                                ℹ️ 7 Levels × 3 Parts = 21 Total Tests • The test will begin after a 3-second countdown
                            </p>
                        </Card>
                    </motion.div>
                )}

                {/* Test Canvas */}
                {phase !== "intro" && phase !== "completed" && phase !== "countdown" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-7xl mx-auto"
                    >
                        <Card className="p-8 bg-white dark:bg-gray-800 shadow-2xl">
                            {/* Levels 1-4: Original polygon tracing */}
                            {currentLevel <= 4 && (
                                <AssessmentCanvas
                                    key={`canvas-${currentLevel}-${currentSublevel}`}
                                    points={points}
                                    onClickPoint={recordClick}
                                    testType={testType as any}
                                    driftParameters={driftParameters}
                                    highlightSchedule={highlightSchedule}
                                    startTime={startTime}
                                    submissions={submissions}
                                    trueOrder={trueOrder}
                                    mistakes={mistakes}
                                />
                            )}

                            {currentLevel === 5 && recognitionTask && (
                                <RecognitionCanvas
                                    key={`recognition-${currentLevel}-${currentSublevel}`}
                                    shapes={recognitionTask.shapes}
                                    onSubmit={async (idx, conf) => {
                                        if (!startTime) return;
                                        const result = await submitRecognition(startTime, idx, conf);
                                        if (result) handleLevelComplete(result);
                                    }}
                                    timeLimitSeconds={30}
                                    startTime={startTime}
                                />
                            )}

                            {currentLevel === 6 && polygonA && polygonB && (
                                <IntersectionCanvas
                                    key={`intersection-${currentLevel}-${currentSublevel}`}
                                    polygonA={polygonA}
                                    polygonB={polygonB}
                                    thresholdPercentage={intersectionThreshold}
                                    animationDurationMs={animationDuration}
                                    onDetection={async (detTime, actTime, area) => {
                                        const result = await submitIntersection(detTime, actTime, intersectionThreshold);
                                        if (result) handleLevelComplete(result);
                                    }}
                                    startTime={startTime}
                                />
                            )}

                            {currentLevel === 7 && targetPolygon && targetPolygon.length > 0 && (
                                <ReconstructionCanvas
                                    key={`reconstruction-${currentLevel}-${currentSublevel}`}
                                    targetPolygon={targetPolygon}
                                    displayTimeMs={displayTimeMs}
                                    onComplete={async (poly, time) => {
                                        const result = await submitReconstruction(poly, time);
                                        if (result) handleLevelComplete(result);
                                    }}
                                    startTime={startTime}
                                />
                            )}
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
                                className="text-xl py-6 px-12 font-bold rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
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
