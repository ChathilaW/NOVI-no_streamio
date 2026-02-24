'use client';

import IndRoom from "@/components/ind-components/Ind-Room";
import IndSetUp from "@/components/ind-components/Ind-Setup";
import { useState } from "react";

const IndLearnPage = () => {
    const [currentView, setCurrentView] = useState<'start' | 'setup' | 'room'>('start');
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    
    const handleStart = () => {
        setCurrentView('setup');
    };

    const handleJoinRoom = () => {
        setCurrentView('room');
    };

    if (currentView === 'room') {
        return <IndRoom initialVideoEnabled={isVideoEnabled} initialAudioEnabled={isAudioEnabled} />;
    }

    if (currentView === 'setup') {
        return <IndSetUp
            onJoinRoom={handleJoinRoom}
            isVideoEnabled={isVideoEnabled}
            setIsVideoEnabled={setIsVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            setIsAudioEnabled={setIsAudioEnabled}
        />;
    }
    return (
        <section className="flex size-full flex-col items-center justify-center gap-8 text-white animate-fade-in min-h-screen">
            <div className="flex flex-col items-center gap-6">
                <h1 className="text-4xl font-bold text-black text-center">
                    Individual Learning
                </h1>
                <p className="text-lg text-gray-600 text-center max-w-md">
                    Ready to begin your learning journey?
                </p>
                <button
                    onClick={handleStart}
                    className="px-8 py-4 text-lg font-semibold text-white rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                    style={{
                        backgroundColor: '#C8A2E0',
                        border: 'none',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#B892D0';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#C8A2E0';
                    }}
                >
                    Start
                </button>
            </div>
        </section>
        
    )
}

export default IndLearnPage