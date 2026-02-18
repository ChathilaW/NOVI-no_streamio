import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

/* ----------------------------------------
   Thresholds & params
---------------------------------------- */
const YAW_NEG_THRESHOLD = -5.0;
const YAW_POS_THRESHOLD = 5.0;
const PITCH_NEG_THRESHOLD = 6.5;
const PITCH_POS_THRESHOLD = 18.0;

const FACE_LOST_GRACE_MS = 600;
const SMOOTHING_ALPHA = 0.7;

/* ----------------------------------------
   Internal state
---------------------------------------- */
let landmarker;
let lastYaw = 0;
let lastPitch = 0;
let lastFaceTime = 0;
let hasPose = false;

/* ----------------------------------------
   Helpers
---------------------------------------- */
function isLookingAway(yaw, pitch) {
  return (
    yaw < YAW_NEG_THRESHOLD ||
    yaw > YAW_POS_THRESHOLD ||
    pitch < PITCH_NEG_THRESHOLD ||
    pitch > PITCH_POS_THRESHOLD
  );
}

function calculateYawPitch(landmarks, w, h) {
  const leftEye = { x: landmarks[33].x * w, y: landmarks[33].y * h };
  const rightEye = { x: landmarks[263].x * w, y: landmarks[263].y * h };
  const noseTip = { x: landmarks[1].x * w, y: landmarks[1].y * h };

  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2
  };

  const dx = noseTip.x - eyeCenter.x;
  const dy = noseTip.y - eyeCenter.y;

  return {
    yaw: Math.atan2(dx, w * 0.35) * (180 / Math.PI),
    pitch: Math.atan2(dy, h * 0.35) * (180 / Math.PI)
  };
}

/* ----------------------------------------
   Public API
---------------------------------------- */
export async function initHeadPosture() {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
  );

  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { 
        modelAssetPath: "/assets/ml-models/face_landmarker.task" },
    runningMode: "VIDEO",
    numFaces: 1
  });
}

export function updateHeadPosture(video, w, h, now) {
  // Check if landmarker is initialized
  if (!landmarker) {
    return { status: "NO FACE" };
  }

  try {
    const result = landmarker.detectForVideo(video, now);

    let yaw, pitch;
    let faceDetected = false;

    if (result.faceLandmarks?.length) {
      const raw = calculateYawPitch(result.faceLandmarks[0], w, h);

      if (!hasPose) {
        yaw = raw.yaw;
        pitch = raw.pitch;
        hasPose = true;
      } else {
        yaw = SMOOTHING_ALPHA * lastYaw + (1 - SMOOTHING_ALPHA) * raw.yaw;
        pitch = SMOOTHING_ALPHA * lastPitch + (1 - SMOOTHING_ALPHA) * raw.pitch;
      }

      lastYaw = yaw;
      lastPitch = pitch;
      lastFaceTime = now;
      faceDetected = true;
    }
    else if (hasPose && now - lastFaceTime <= FACE_LOST_GRACE_MS) {
      yaw = lastYaw;
      pitch = lastPitch;
      faceDetected = true;
    }

    if (!faceDetected) {
      return { status: "NO FACE" };
    }

    const distracted = isLookingAway(yaw, pitch);

    return {
      status: distracted ? "DISTRACTED" : "FOCUSED",
      yaw,
      pitch
    };
  } catch (err) {
    // Silently handle video not ready errors
    return { status: "NO FACE" };
  }
}