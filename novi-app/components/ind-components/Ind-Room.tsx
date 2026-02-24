'use client';

import { useState, useEffect, useRef } from 'react';
import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { initDistraction, detectDistraction } from '@/ml-calculations/combined';
import Dashboard from './Ind-Dashboard';
import IndEndCallButton from './Ind-EndCallButton';

interface IndRoomProps {
    initialVideoEnabled?: boolean;
    initialAudioEnabled?: boolean;
}

const IndRoom = ({initialVideoEnabled = true, initialAudioEnabled = true }: IndRoomProps = {}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);
    const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled);

   // Distraction detection state
    const [distractionData, setDistractionData] = useState<any>(null);
    const [isDistractionInitialized, setIsDistractionInitialized] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const animationFrameRef = useRef<number | null>(null);

     // Focus tracking state
    const [focusedCount, setFocusedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Initialize media stream
    const startMediaStream = async (enableVideo: boolean, enableAudio: boolean) => {
        try {
            // Stop existing stream first
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: enableVideo ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false,
                audio: enableAudio ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setMediaStream(stream);

            // Attach video stream to video element
            if (videoRef.current && enableVideo) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing media devices:', err);
        }
    };

    // Toggle video
    const toggleVideo = () => {
        const newVideoState = !isVideoEnabled;
        setIsVideoEnabled(newVideoState);

        // Clear distraction data when camera is turned off
        if (!newVideoState) {
            setDistractionData(null);
        }
        
        if (mediaStream) {
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = newVideoState;
                
                // Update video element srcObject when re-enabling
                if (newVideoState && videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }
        }
    };

    // Toggle audio
    const toggleAudio = () => {
        const newAudioState = !isAudioEnabled;
        setIsAudioEnabled(newAudioState);
        
        if (mediaStream) {
            const audioTrack = mediaStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = newAudioState;
            }
        }
    };

    // Handle end session - cleanup and close
    const handleEndCall = () => {
        // Stop all media tracks
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        // Cancel distraction detection animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    // Initialize on mount
    useEffect(() => {
        startMediaStream(true, true);

        return () => {
            // Cleanup on unmount
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Update video element when isVideoEnabled changes
    useEffect(() => {
        if (videoRef.current && mediaStream && isVideoEnabled) {
            // Set srcObject when video element is mounted and video is enabled
            videoRef.current.srcObject = mediaStream;
        }
    }, [isVideoEnabled, mediaStream]);

    // Initialize distraction detection
    useEffect(() => {
        const setupDistraction = async () => {
            try {
                await initDistraction();
                setIsDistractionInitialized(true);
            } catch (err) {
                console.error('Error initializing distraction detection:', err);
            }
        };

        setupDistraction();
    }, []);

    // Continuous distraction detection loop
    useEffect(() => {
            if (!isDistractionInitialized || !videoRef.current || !isVideoEnabled) {
            return;
        }

        const detectDistract = () => {
            if (videoRef.current && isVideoEnabled) {
                 const width = videoRef.current.videoWidth;
                const height = videoRef.current.videoHeight;
                
                // Only run detection if video dimensions are valid
                if (width > 0 && height > 0) {
                    const result = detectDistraction(
                        videoRef.current,
                        width,
                        height,
                        performance.now()
                    );
                    // Always update state, including error/no face states
                    setDistractionData(result);
                                       
                    // Track focus samples (count every valid detection)
                    if (result && (result.status === "FOCUSED" || result.status === "DISTRACTED")) {
                        setTotalCount(prev => prev + 1);
                        if (result.status === "FOCUSED") {
                            setFocusedCount(prev => prev + 1);
                        }
                    }
                }
            }
            animationFrameRef.current = requestAnimationFrame(detectDistract);
        };

        detectDistract();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isDistractionInitialized, isVideoEnabled]);

    return (
        <div className="fixed inset-0 flex flex-col w-full bg-gray-900 z-[60]">
                {/* Main Content Area - Video and Dashboard */}
                <div className="flex-1 flex items-center justify-center p-4 pb-30 gap-4">
                {/* Video Container */}
                <div className={`flex items-center justify-center transition-all duration-300 ${
                    showDashboard ? 'w-[65%]' : 'w-full'
                }`}>
                    <div className="relative w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
                        {isVideoEnabled ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover bg-gray-800"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <div className="text-center">
                                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-white text-lg">Camera is off</p>    
                                </div>
                               
                            </div>
                        
                    )}
                </div>
            </div>    

                {/* Dashboard Panel */}
                {showDashboard && (
                    <div className="flex items-start justify-center">
                        <Dashboard 
                            stats={distractionData} 
                            isVideoEnabled={isVideoEnabled}
                            focusedCount={focusedCount}
                            totalCount={totalCount}
                            onClose={() => setShowDashboard(false)} 
                        />
                    </div>
                )}
            </div>

            {/* Bottom Navbar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
                <div className="flex items-center justify-center gap-6">
                    {/* Camera Button */}
                    <button
                        onClick={toggleVideo}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:scale-105"
                        style={{ backgroundColor: isVideoEnabled ? '#C8A2E0' : '#ef4444' }}
                    >
                        {isVideoEnabled ? (
                            <VideoCameraIcon className="w-6 h-6 text-white" />
                        ) : (
                            <VideoCameraSlashIcon className="w-6 h-6 text-white" />
                        )}
                        <span className="text-white text-sm font-medium">Camera</span>
                    </button>

                    {/* Audio Button */}
                    <button
                        onClick={toggleAudio}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:scale-105"
                        style={{ backgroundColor: isAudioEnabled ? '#C8A2E0' : '#ef4444' }}
                    >
                        {isAudioEnabled ? (
                            <MicrophoneIcon className="w-6 h-6 text-white" />
                        ) : (
                            <MicrophoneIcon className="w-6 h-6 text-white" />
                        )}
                        <span className="text-white text-sm font-medium">Audio</span>
                    </button>

                    {/* Dashboard Button */}
                    <button
                        onClick={() => setShowDashboard(!showDashboard)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:scale-105 bg-gray-700 hover:bg-gray-600"
                    >
                        <ChartBarIcon className="w-6 h-6 text-white" />
                        <span className="text-white text-sm font-medium">Dashboard</span>
                    </button>

                    {/* End Session Button */}
                    <IndEndCallButton onEndCall={handleEndCall} />
                </div>
            </div>

           
        </div>
    );
};

export default IndRoom;
