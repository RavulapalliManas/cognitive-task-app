"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/userAuth";
import AssessmentCanvas from "./canvas";
import RecognitionCanvas from "./RecognitionCanvas";
import IntersectionCanvas from "./IntersectionCanvas";
import ReconstructionCanvas from "./ReconstructionCanvas";
import NavigationCanvas from "./NavigationCanvas";
import MazeCanvas from "./MazeCanvas";
import { useAssessment } from "./useassessment";
import { Button, Card, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import AssessmentHUD from "@/app/components/AssessmentHUD";

type TestPhase = "intro" | "countdown" | "testing" | "processing" | "completed";
type LevelTimeData = {
    startTime: number;
    endTime: number | null;
    duration: number;
};

// Test configuration: 7 levels, 3 sublevels each
const MAX_LEVELS = 8;
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

        // Level 7
        startLevel7, targetPolygon, displayTimeMs, submitReconstruction,
        mazeLeftWall, mazeRightWall,

        // Navigation
        startLevel8, leftWall, rightWall, startPoint, endPoint, submitNavigation,

        kineticRef,
        hiddenIndices // Added
    } = useAssessment();

    const [phase, setPhase] = useState<TestPhase>("intro");
    const [countdown, setCountdown] = useState(2);
    const [showLevelTransition, setShowLevelTransition] = useState(false);
    const [showSublevelTransition, setShowSublevelTransition] = useState(false);

    // UI State for transitions
    const [nextLevelInfo, setNextLevelInfo] = useState<{ level: number, sublevel: number, type: string } | null>(null);

    // Logic State for transition targets (Ref is safer than state for logic)
    const nextLevelTargetRef = useRef<{ level: number, sublevel: number } | null>(null);

    const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
    const [globalElapsedTime, setGlobalElapsedTime] = useState(0);
    const [levelTimes, setLevelTimes] = useState<Record<string, LevelTimeData>>({});
    const [currentLevelStartTime, setCurrentLevelStartTime] = useState<number | null>(null);
    const [currentLevelElapsedTime, setCurrentLevelElapsedTime] = useState(0);

    // Results Queue
    const resultsQueue = useRef<any[]>([]);
    const [processingProgress, setProcessingProgress] = useState(0);

    // Prevent duplicate requests
    const isLoadingRef = useRef(false);
    const currentLevelRef = useRef<{ level: number, sublevel: number } | null>(null);
    const isTransitioningRef = useRef(false);

    // Check authentication
    useEffect(() => {
        if (!isLoggedIn()) {
            router.replace("/tests");
        }
    }, [router]);

    // Pause State
    const [isPaused, setIsPaused] = useState(false);

    // Audio Logic
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioContext = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    };

    const playSuccess = () => {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    };

    const playError = () => {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    };

    const prevSubmissionsLen = useRef(0);
    const prevMistakes = useRef(0);

    useEffect(() => {
        if (!submissions || (mistakes === undefined)) return;
        if (submissions.length > prevSubmissionsLen.current) {
            playSuccess();
        }
        prevSubmissionsLen.current = submissions.length;
        if (mistakes > prevMistakes.current) {
            playError();
        }
        prevMistakes.current = mistakes;
    }, [submissions, mistakes]);

    // Timer Logic
    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(() => {
            if (globalStartTime) {
                setGlobalElapsedTime(Date.now() - globalStartTime);
            }
            if (currentLevelStartTime) {
                setCurrentLevelElapsedTime(Date.now() - currentLevelStartTime);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [globalStartTime, currentLevelStartTime, isPaused]);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
    };

    const getLevelName = (level: number) => {
        switch (level) {
            case 1: return "Focused Attention";
            case 2: return "Visuospatial Memory";
            case 3: return "Sustained Attention";
            case 4: return "Dual Task";
            case 5: return "Shape Recognition";
            case 6: return "Intersection Drawing";
            case 7: return "Polygon Construction";
            case 8: return "Maze Navigation";
            default: return "Unknown";
        }
    };

    const startLevel = useCallback(async (level: number, sublevel: number) => {
        if (isLoadingRef.current) return;
        if (currentLevelRef.current?.level === level && currentLevelRef.current?.sublevel === sublevel) return;

        isLoadingRef.current = true;
        currentLevelRef.current = { level, sublevel };

        try {
            setPhase("testing");
            setCurrentLevelStartTime(Date.now());

            // LOGIC MAPPING: UI Level -> Backend Level
            if (level === 1) await start(1, sublevel, "basic");
            else if (level === 2) await start(2, sublevel, "memory");
            else if (level === 3) await start(3, sublevel, "attention");
            else if (level === 4) await start(4, sublevel, "combined"); // L4: Dual Task
            else if (level === 5) await startLevel5(5, sublevel);       // L5: Recognition
            else if (level === 6) await startLevel6(6, sublevel);       // L6: Intersection
            else if (level === 7) await startLevel7(7, sublevel);       // L7: Reconstruction
            else if (level === 8) await startLevel8(8, sublevel);       // L8: Maze/Navigation
            else await start(level, sublevel, "basic");

        } catch (error) {
            console.error("Error starting level:", error);
        } finally {
            isLoadingRef.current = false;
        }
    }, [start, startLevel5, startLevel6, startLevel7, startLevel8]);

    // Countdown Logic - Now uses nextLevelTargetRef for reliable logic flow
    useEffect(() => {
        if (phase === "countdown" && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (phase === "countdown" && countdown === 0) {
            if (!globalStartTime) {
                setGlobalStartTime(Date.now());
                startLevel(1, 1);
            } else if (nextLevelTargetRef.current) {
                // Use Ref for logic source of truth
                startLevel(nextLevelTargetRef.current.level, nextLevelTargetRef.current.sublevel);
                nextLevelTargetRef.current = null;
            } else if (nextLevelInfo) {
                // Fallback for initial load or edge cases
                startLevel(nextLevelInfo.level, nextLevelInfo.sublevel);
            }
        }
    }, [phase, countdown, globalStartTime, startLevel]);
    // Depend only on stable refs/state. nextLevelInfo in deps is okay but ref is preferred logic path check in effect body.

    // Transition Cleanup Effects
    useEffect(() => {
        if (showLevelTransition) {
            const timer = setTimeout(() => {
                setShowLevelTransition(false);
                isLoadingRef.current = false;
                currentLevelRef.current = null; // Unlock for next level
                setPhase("countdown");
                setCountdown(2);
                isTransitioningRef.current = false;
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [showLevelTransition]);

    useEffect(() => {
        if (showSublevelTransition) {
            const timer = setTimeout(() => {
                setShowSublevelTransition(false);
                isLoadingRef.current = false;
                currentLevelRef.current = null; // Unlock for next sublevel
                setPhase("countdown");
                setCountdown(2);
                isTransitioningRef.current = false;
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [showSublevelTransition]);

    const processAndSaveResults = async () => {
        setPhase("processing");

        const steps = ["Normalizing Data...", "Computing Digital Biomarkers...", "Generating Cognitive Profile...", "Finalizing Report..."];
        for (let i = 0; i < steps.length; i++) {
            setProcessingProgress(((i + 1) / steps.length) * 100);
            await new Promise(r => setTimeout(r, 600)); // Simulate work
        }

        try {
            const currentHistory = JSON.parse(localStorage.getItem("assessment_results") || "[]");
            const updatedHistory = [...currentHistory, ...resultsQueue.current];
            localStorage.setItem("assessment_results", JSON.stringify(updatedHistory));
        } catch (e) {
            console.error("Batch save failed", e);
        }

        setPhase("completed");
    };

    const handleFinish = useCallback(async () => {
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
        if (result) {
            resultsQueue.current.push({
                ...result,
                level: currentLevel,
                sublevel: currentSublevel,
                timestamp: Date.now()
            });
        }
        await processAndSaveResults();
    }, [currentLevel, currentSublevel, currentLevelStartTime, finish, setLevelTimes]);

    const handleNextLevel = useCallback(async () => {
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;

        const nextSublevel = currentSublevel + 1;
        const nextLevel = currentLevel;

        let target = { level: currentLevel, sublevel: currentSublevel };

        if (nextSublevel > SUBLEVELS_PER_LEVEL) {
            if (currentLevel >= MAX_LEVELS) {
                handleFinish();
                isTransitioningRef.current = false;
                return;
            }
            // Next Level
            const newLevel = currentLevel + 1;
            target = { level: newLevel, sublevel: 1 };

            setNextLevelInfo({
                level: newLevel,
                sublevel: 1,
                type: getLevelName(newLevel)
            });
            nextLevelTargetRef.current = target;
            setShowLevelTransition(true);
        } else {
            // Next Sublevel
            target = { level: nextLevel, sublevel: nextSublevel };

            setNextLevelInfo({
                level: nextLevel,
                sublevel: nextSublevel,
                type: `${getLevelName(nextLevel)} - Part ${nextSublevel}`
            });
            nextLevelTargetRef.current = target;
            setShowSublevelTransition(true);
        }
    }, [currentLevel, currentSublevel, setNextLevelInfo, setShowLevelTransition, setShowSublevelTransition, handleFinish]);

    const handleLevelComplete = useCallback((result: any = null) => {
        if (result) {
            resultsQueue.current.push({
                ...result,
                level: currentLevel,
                sublevel: currentSublevel,
                timestamp: Date.now()
            });
        }
        handleNextLevel();
    }, [handleNextLevel, currentLevel, currentSublevel]);

    // Auto-advance Logic (for simple connect tasks)
    const hasSubmittedRef = useRef(false);
    useEffect(() => { hasSubmittedRef.current = false; }, [currentLevel, currentSublevel]);

    useEffect(() => {
        if (currentLevel <= 4 && trueOrder && submissions && trueOrder.length > 0) {
            const isComplete = submissions.length === trueOrder.length;
            if (isComplete && !hasSubmittedRef.current) {
                hasSubmittedRef.current = true;
                const submitAndAdvance = async () => {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const result = await finish();
                    if (result) handleLevelComplete(result);
                };
                submitAndAdvance();
            }
        }
    }, [currentLevel, trueOrder, submissions, finish, handleLevelComplete]);

    const memoryMode = useMemo(() => ({
        enabled: currentLevel === 2,
        sublevel: currentSublevel
    }), [currentLevel, currentSublevel]);

    const handleBeginAssessment = () => {
        isLoadingRef.current = false;
        currentLevelRef.current = null;
        setPhase("countdown");
        setCountdown(2);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:from-gray-900">
            {/* Level Transition Overlay */}
            <AnimatePresence>
                {showLevelTransition && nextLevelInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="text-center flex flex-col items-center"
                        >
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
                            {/* Animated Icons REMOVED as per user request */}
                            <h2 className="text-white text-5xl font-black mb-3">Part {nextLevelInfo.sublevel - 1} Complete!</h2>
                            <p className="text-white text-2xl font-medium">Next: Part {nextLevelInfo.sublevel}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Processing Overlay */}
            <AnimatePresence>
                {phase === "processing" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8"
                    >
                        <div className="w-full max-w-lg text-center">
                            <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">Analyzing Cognitive Performance</h2>
                            <Progress
                                size="lg"
                                color="primary"
                                value={processingProgress}
                                showValueLabel={true}
                                className="mb-4"
                            />
                            <p className="text-gray-500 animate-pulse">Computing advanced geometric metrics...</p>
                        </div>
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
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-white text-[15rem] font-black leading-none mb-8"
                        >
                            {countdown > 0 ? countdown : "GO!"}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="max-w-xl mx-auto"
                        >
                            <h3 className="text-4xl text-blue-400 font-bold mb-4">
                                {nextLevelInfo ? getLevelName(nextLevelInfo.level) : getLevelName(currentLevel)}
                            </h3>
                            <p className="text-2xl text-gray-300 font-medium leading-relaxed px-12">
                                {currentLevel === 1 && "Connect the points in numerical order: 1 ➞ 2 ➞ 3..."}
                                {currentLevel === 2 && "Memory Test: 50% of numbers are hidden. Watch for yellow flashes to reveal the next target!"}
                                {currentLevel === 3 && "Attention Test: Points are drifting! Track the moving targets and click them in order."}
                                {currentLevel === 4 && "Combined Test: Points are drifting AND hidden. Focus hard to track the correct sequence!"}
                                {currentLevel === 5 && "Shape Recognition: Analyze the point cloud and identify the object."}
                                {currentLevel === 6 && "Intersection Drawing: Freeze the shapes and draw the overlapping region!"}
                                {currentLevel === 7 && "Polygon Construction: Memorize the shape and reconstruct it exactly!"}
                                {currentLevel === 8 && "Maze Navigation: Navigate from the start to the end without touching the walls!"}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HUD */}
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
                            progress={(submissions && trueOrder) ? (submissions.length / (trueOrder.length || 1) * 100) : 0}
                            submissionsCount={submissions?.length || 0}
                            totalTargets={trueOrder?.length || 0}
                            mistakes={mistakes}
                            showUndo={currentLevel < 5}
                            onUndo={undoLastClick}
                            formatTime={formatTime}
                            isPaused={isPaused}
                            onTogglePause={() => setIsPaused(!isPaused)}
                            onSkipLevel={(level) => {
                                // Admin Skip: Force jump
                                isLoadingRef.current = false;
                                currentLevelRef.current = null;
                                nextLevelTargetRef.current = { level, sublevel: 1 };
                                startLevel(level, 1);
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`${phase !== "intro" && phase !== "completed" && phase !== "countdown" && phase !== "processing" && !showLevelTransition ? "pt-32" : ""} px-6 py-8`}>
                {phase === "intro" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-5xl mx-auto"
                    >
                        <Card className="p-16 bg-white dark:bg-gray-800 shadow-2xl rounded-3xl">
                            <div className="text-center mb-12">
                                <h1 className="text-7xl font-black mb-6 text-gray-900 dark:text-white">Cognitive Assessment</h1>
                                <p className="text-2xl text-gray-700 dark:text-gray-300 font-medium leading-relaxed mb-8">
                                    Complete 7 levels to analyze your cognitive performance.
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-left max-w-3xl mx-auto bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl">
                                    <div className="space-y-2">
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mr-3">1</span> Path Integration</div>
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mr-3">2</span> Visuospatial Memory</div>
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mr-3">3</span> Sustained Attention</div>
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mr-3">4</span> Dual Task</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold mr-3">5</span> Shape Recognition</div>
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold mr-3">6</span> Intersection Drawing</div>
                                        <div className="flex items-center"><span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold mr-3">7</span> Maze Tracing</div>
                                    </div>
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
                        </Card>
                    </motion.div>
                )}

                {phase === "testing" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto">
                        <Card className="p-8 bg-white dark:bg-gray-800 shadow-2xl">
                            {(currentLevel === 1 || currentLevel === 2 || currentLevel === 3 || currentLevel === 4) && points && (
                                <AssessmentCanvas
                                    points={points}
                                    onClickPoint={(idx) => recordClick(idx)}
                                    testType={
                                        currentLevel === 1 ? "basic" :
                                            currentLevel === 2 ? "memory" :
                                                currentLevel === 3 ? "attention" : "combined"
                                    }
                                    memoryMode={memoryMode}
                                    driftParameters={driftParameters || undefined}
                                    highlightSchedule={highlightSchedule || undefined}
                                    hiddenIndices={hiddenIndices} // Added prop
                                    startTime={currentLevelStartTime}
                                    submissions={submissions || []}
                                    trueOrder={trueOrder || []}
                                    mistakes={mistakes}
                                    kineticDataRef={currentLevel === 3 ? kineticRef : undefined}
                                    isPaused={isPaused}
                                />
                            )}
                            {currentLevel === 5 && recognitionTask && (
                                <RecognitionCanvas
                                    shapes={recognitionTask.shapes}
                                    timeLimitSeconds={30}
                                    startTime={currentLevelStartTime}
                                    targetImageUrl={recognitionTask.target_image_url}
                                    onSubmit={async (idx, conf) => {
                                        if (!currentLevelStartTime) return;
                                        const result = await submitRecognition(currentLevelStartTime, idx, conf);
                                        if (result) handleLevelComplete(result);
                                    }}
                                />
                            )}

                            {currentLevel === 6 && polygonA && polygonB && (
                                <IntersectionCanvas
                                    key={`intersection-${currentLevel}-${currentSublevel}`}
                                    polygonA={polygonA}
                                    polygonB={polygonB}
                                    thresholdPercentage={intersectionThreshold}
                                    animationDurationMs={animationDuration}
                                    startTime={currentLevelStartTime}
                                    onSubmitDrawing={async (drawnPath, actualIntersection, detectionTime) => {
                                        // Level 6 now expects drawn path
                                        const result = await submitIntersection(
                                            detectionTime,
                                            0, // actual time not relevant for drawing mode
                                            intersectionThreshold,
                                            drawnPath,
                                            actualIntersection
                                        );
                                        if (result) handleLevelComplete(result);
                                    }}
                                />
                            )}

                            {currentLevel === 7 && targetPolygon && (
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

                            {currentLevel === 8 && (
                                <NavigationCanvas
                                    leftWall={leftWall}
                                    rightWall={rightWall}
                                    startPoint={startPoint}
                                    endPoint={endPoint}
                                    onComplete={(path, collisions) => {
                                        const timeTaken = Date.now() - (startTime || 0);
                                        submitNavigation(path, timeTaken, collisions).then(() => handleLevelComplete());
                                    }}
                                />
                            )}
                        </Card>
                    </motion.div>
                )}

                {phase === "completed" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-4xl mx-auto pt-32 px-6"
                    >
                        <Card className="p-12 text-center bg-white dark:bg-gray-800 shadow-2xl rounded-3xl">
                            <div className="flex justify-center mb-8"><div className="text-8xl">🎉</div></div>
                            <h1 className="text-5xl font-black mb-6 text-gray-900 dark:text-white">Assessment Complete!</h1>
                            <p className="text-2xl text-gray-600 dark:text-gray-300 mb-8">Your cognitive profile has been generated.</p>

                            <div className="grid grid-cols-2 gap-6 mb-12 max-w-lg mx-auto">
                                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-2xl">
                                    <div className="text-sm text-gray-500 uppercase font-bold mb-2">Total Time</div>
                                    <div className="text-3xl font-mono font-bold text-blue-600">{formatTime(globalElapsedTime)}</div>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-2xl">
                                    <div className="text-sm text-gray-500 uppercase font-bold mb-2">Tests Completed</div>
                                    <div className="text-3xl font-mono font-bold text-green-600">{resultsQueue.current.length} / 21</div>
                                </div>
                            </div>
                            <Button
                                size="lg"
                                color="success"
                                variant="shadow"
                                onClick={() => router.push("/results")}
                                className="text-2xl py-8 px-12 font-bold rounded-2xl"
                            >
                                View Detailed Results ➔
                            </Button>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
