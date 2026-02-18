import {
  initHeadPosture,
  updateHeadPosture
} from "./headPosture.js";

import { updateGaze } from "./gaze.js";

import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

/* ----------------------------------------
   Internal state
---------------------------------------- */
let faceLandmarker;

/* ----------------------------------------
   Public API
---------------------------------------- */

export async function initDistraction() {
  // Initialize head posture detection
  await initHeadPosture();

  // Initialize MediaPipe FaceLandmarker for gaze detection
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { 
      modelAssetPath: "/assets/ml-models/face_landmarker.task" 
    },
    runningMode: "VIDEO",
    numFaces: 1
  });

  return faceLandmarker;
}

export function detectDistraction(video, width, height, timestamp) {
  try {
    // Check if video is ready
    if (!video || video.readyState < 2) {
      return null;
    }

    // Check if dimensions are valid
    if (!width || !height || width === 0 || height === 0) {
      return null;
    }

    // Step 1: Check head posture
    const headResult = updateHeadPosture(video, width, height, timestamp);

    // If no face detected, return early
    if (headResult.status === "NO FACE") {
      return {
        status: "NO FACE",
        headPosture: null,
        gaze: null
      };
    }

    // Step 2: If user is focused, also detect gaze
    let gazeResult = null;
    let finalStatus = headResult.status;

    if (headResult.status === "FOCUSED" && faceLandmarker) {
      const faceDetection = faceLandmarker.detectForVideo(video, timestamp);
      if (faceDetection.faceLandmarks?.length) {
        gazeResult = updateGaze(
          faceDetection.faceLandmarks[0],
          width,
          height
        );

        // If gaze is not CENTER, mark as DISTRACTED
        if (gazeResult && gazeResult.gaze !== "CENTER") {
          finalStatus = "DISTRACTED";
        }
      }
    }

    // Return combined results
    return {
      status: finalStatus, // "FOCUSED" (head + gaze centered), "DISTRACTED" (head or gaze off), or from headResult
      headPosture: {
        yaw: headResult.yaw,
        pitch: headResult.pitch
      },
      gaze: gazeResult // null if distracted or { gaze, horizontalRatio, verticalRatio }
    };
  } catch (err) {
    // Silently return null for video not ready errors
    if (err.message?.includes('video') || err.message?.includes('ready')) {
      return null;
    }
    console.error("Error in distraction detection:", err);
    return {
      status: "ERROR",
      headPosture: null,
      gaze: null
    };
  }
}

