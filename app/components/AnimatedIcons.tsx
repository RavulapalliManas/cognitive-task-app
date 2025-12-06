"use client";
import React from "react";
import { motion } from "framer-motion";

export const AnimatedCheckmark = () => {
    return (
        <svg
            width="120"
            height="120"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke="white"
                strokeWidth="5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />
            <motion.path
                d="M30 50L45 65L70 35"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.25, ease: "easeOut" }}
            />
        </svg>
    );
};

export const AnimatedHourglass = () => {
    return (
        <svg
            width="120"
            height="120"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <motion.path
                d="M30 20 H70 L50 50 L30 20 Z"
                fill="white"
                opacity="0.8"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 0.8 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
            />
            <motion.path
                d="M30 80 H70 L50 50 L30 80 Z"
                fill="white"
                opacity="0.8"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 0.8 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
            />
            <motion.path
                d="M30 20 H70 L50 50 L70 80 H30 L50 50 L30 20"
                stroke="white"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
            />
        </svg>
    );
};

export const AnimatedBrain = () => {
    return (
        <svg
            width="140"
            height="140"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <motion.path
                d="M20 50 C20 20 40 10 50 10 C60 10 80 20 80 50 C80 80 60 90 50 90 C40 90 20 80 20 50"
                stroke="#4F46E5"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear" }}
            />
            {/* Simple brain convolutions */}
            <motion.path
                d="M35 35 C40 25 60 25 65 35 C70 45 60 55 50 55 C40 55 30 45 35 35"
                stroke="#9333EA"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
            />
            <motion.path
                d="M30 60 C35 70 65 70 70 60"
                stroke="#0EA5E9"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ scaleX: 0.8 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
            />
        </svg>
    );
};

export const AnimatedTarget = () => {
    return (
        <svg
            width="120"
            height="120"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <motion.circle
                cx="50"
                cy="50"
                r="40"
                stroke="white"
                strokeWidth="4"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            />
            <motion.circle
                cx="50"
                cy="50"
                r="25"
                stroke="white"
                strokeWidth="4"
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            />
            <motion.circle
                cx="50"
                cy="50"
                r="10"
                fill="white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            />
        </svg>
    );
}
