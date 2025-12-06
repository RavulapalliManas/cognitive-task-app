"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@heroui/react";

interface MazeCanvasProps {
    path: Array<{ x: number, y: number }>;
    leftWall: Array<{ x: number, y: number }>;
    rightWall: Array<{ x: number, y: number }>;
    onComplete: (userPath: Array<{ x: number, y: number }>, timestamps: number[]) => void;
    timeLimitSeconds: number;
}

export default function MazeCanvas({
    path,
    leftWall,
    rightWall,
    onComplete,
    timeLimitSeconds
}: MazeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [userPath, setUserPath] = useState<Array<{ x: number, y: number }>>([]);
    const [timestamps, setTimestamps] = useState<number[]>([]);
    const [completed, setCompleted] = useState(false);

    // Render Maze (Static)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Walls
        const drawPoly = (points: Array<{ x: number, y: number }>, color: string, width: number) => {
            if (points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        };

        drawPoly(leftWall, "#4b5563", 4); // Gray Wall
        drawPoly(rightWall, "#4b5563", 4);

        // Draw Centerline (Faint guide)
        drawPoly(path, "rgba(59, 130, 246, 0.2)", 2);

        // Draw User Path
        if (userPath.length > 1) {
            ctx.beginPath();
            ctx.moveTo(userPath[0].x * canvas.width, userPath[0].y * canvas.height);
            for (let i = 1; i < userPath.length; i++) {
                ctx.lineTo(userPath[i].x * canvas.width, userPath[i].y * canvas.height);
            }
            ctx.strokeStyle = "#ef4444"; // Red trace
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }, [path, leftWall, rightWall, userPath]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (completed) return;
        setIsDrawing(true);
        const pt = getPoint(e);
        if (pt) {
            setUserPath([pt]);
            setTimestamps([Date.now()]);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || completed) return;
        const pt = getPoint(e);
        if (pt) {
            setUserPath(prev => [...prev, pt]);
            setTimestamps(prev => [...prev, Date.now()]);
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
        // If path is long enough, consider it a submission attempt
        if (userPath.length > 20) {
            setCompleted(true);
            onComplete(userPath, timestamps);
        }
    };

    const getPoint = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height
        };
    };

    return (
        <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">Trace the Path!</h2>
            <div className="relative border-4 border-gray-300 rounded-xl overflow-hidden bg-white shadow-lg touch-none">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="cursor-crosshair w-full h-auto"
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                />
            </div>
            <p className="mt-4 text-gray-500">Click and drag to verify your motor control.</p>
        </div>
    );
}
