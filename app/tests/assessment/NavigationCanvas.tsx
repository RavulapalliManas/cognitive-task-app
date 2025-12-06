
"use client";

import React, { useEffect, useRef, useState } from "react";
import { PointLabel } from "./hooks/useNavigationTask";

interface NavigationCanvasProps {
    leftWall: PointLabel[];
    rightWall: PointLabel[];
    startPoint: PointLabel | null;
    endPoint: PointLabel | null;
    onComplete: (path: PointLabel[], collisions: number) => void;
}

export default function NavigationCanvas({
    leftWall,
    rightWall,
    startPoint,
    endPoint,
    onComplete
}: NavigationCanvasProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [path, setPath] = useState<PointLabel[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [collisions, setCollisions] = useState(0);
    const [finished, setFinished] = useState(false);

    // SVG Dimensions
    const WIDTH = 800;
    const HEIGHT = 600;

    // Scale helper
    const toScreen = (x: number, y: number) => ({
        x: x * WIDTH,
        y: y * HEIGHT
    });

    // Start drawing
    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (finished) return;
        setIsDrawing(true);
        setPath([]);
        setCollisions(0);

        // Prevent scroll
        // e.preventDefault(); // Can't prevent default on passive event, handle in logic
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || finished || !svgRef.current) return;

        // Get coords
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const rawX = clientX - rect.left;
        const rawY = clientY - rect.top;

        const normX = rawX / WIDTH;
        const normY = rawY / HEIGHT;

        // Add point
        const newPoint = { x: normX, y: normY, index: path.length };
        setPath(prev => [...prev, newPoint]);

        // Check collision (Naive check against wall points - improved: check if outside corridor polygon)
        // Construct corridor polygon? Or checks distance to segments.
        // Simple heuristic: if gathered path is outside convex hull of segment?
        // Actually, walls are defined by points.
        // Let's just assume valid if between left and right walls?
        // Let's implement a simple distance check:
        // Find nearest point on left wall and right wall.
        // If distance < 0 (outside), collision.

        // Since implementing robust point-in-polygon relative to the corridor strip is expensive in 
        // real-time JS without libraries, we'll skip real-time collision *physics* and just grade it later.
        // OR: Just check if user is roughly "in bounds".
        // For now, let the backend handle detailed collision grading.
        // Frontend just collects points.

        // Check if reached end
        if (endPoint) {
            const dx = normX - endPoint.x;
            const dy = normY - endPoint.y;
            if (Math.sqrt(dx * dx + dy * dy) < 0.05) { // 5% radius
                setFinished(true);
                setIsDrawing(false);
                onComplete([...path, newPoint], collisions);
            }
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    // Generate Polygon Paths for SVG
    const generateWallPath = (screenPoints: { x: number, y: number }[], isLeft: boolean) => {
        if (screenPoints.length === 0) return "";
        let d = `M ${screenPoints[0].x} ${screenPoints[0].y}`;
        for (let i = 1; i < screenPoints.length; i++) {
            d += ` L ${screenPoints[i].x} ${screenPoints[i].y}`;
        }
        return d;
    };

    // Render
    return (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-900 rounded-xl select-none touch-none">
            <svg
                ref={svgRef}
                width={WIDTH}
                height={HEIGHT}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="bg-gray-800 rounded-lg cursor-crosshair border-2 border-slate-700"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            >
                {/* Walls */}
                <path
                    d={generateWallPath(leftWall.map(p => toScreen(p.x, p.y)), true)}
                    fill="none"
                    stroke="#FF4444"
                    strokeWidth="4"
                />
                <path
                    d={generateWallPath(rightWall.map(p => toScreen(p.x, p.y)), false)}
                    fill="none"
                    stroke="#FF4444"
                    strokeWidth="4"
                />

                {/* Visual Connector for Walls (to make it look like a tube? Optional) */}

                {/* Start Point */}
                {startPoint && (
                    <circle
                        cx={toScreen(startPoint.x, startPoint.y).x}
                        cy={toScreen(startPoint.x, startPoint.y).y}
                        r={20}
                        fill="#44FF44"
                        opacity={0.6}
                    />
                )}

                {/* End Point */}
                {endPoint && (
                    <circle
                        cx={toScreen(endPoint.x, endPoint.y).x}
                        cy={toScreen(endPoint.x, endPoint.y).y}
                        r={20}
                        fill="#FF4444"
                        opacity={0.6}
                        className="animate-pulse"
                    />
                )}

                {/* User Path */}
                <path
                    d={generateWallPath(path.map(p => toScreen(p.x, p.y)), false)}
                    fill="none"
                    stroke="#4488FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {!isDrawing && !finished && startPoint && path.length === 0 && (
                    <text x={WIDTH / 2} y={HEIGHT / 2} fill="white" textAnchor="middle" className="text-xl pointer-events-none">
                        Drag from Green to Red
                    </text>
                )}
            </svg>
        </div>
    );
}
