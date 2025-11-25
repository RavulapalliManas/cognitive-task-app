"use client";

import React from "react";

type PointType = {
    x: number;
    y: number;
    label?: string | null;
    index: number;
};

interface AssessmentCanvasProps {
    points: PointType[];
    onClickPoint: (pointIndex: number) => void;
}

export default function AssessmentCanvas({ points, onClickPoint }: AssessmentCanvasProps) {
    return (
        <svg width="100%" height="500">
            {points.map((p, i) => (
                <g key={i} onClick={() => onClickPoint(p.index)}>
                    <circle
                        cx={p.x * 500}
                        cy={p.y * 500}
                        r="6"
                        fill="white"
                        stroke="black"
                    />
                    {p.label && (
                        <text
                            x={p.x * 500 + 10}
                            y={p.y * 500}
                            fill="black"
                            fontSize="14"
                        >
                            {p.label}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}
