/* ------------------------------
   Landmark indices
------------------------------ */

const LEFT_EYE_CORNERS = [33, 133];
const RIGHT_EYE_CORNERS = [362, 263];
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];

/* ------------------------------
   Utilities
------------------------------ */

function lmPx(lm, i, w, h) {
  return { 
    x: lm[i].x * w,
    y: lm[i].y * h 
  };
}

function irisCenter(lm, ids, w, h) {
  let x = 0, y = 0;
  ids.forEach(i => {
    const p = lmPx(lm, i, w, h);
    x += p.x;
    y += p.y;
  });
  return { x: x / ids.length, y: y / ids.length };
}

/* ------------------------------
   Init MediaPipe
------------------------------ */

export async function initGaze() {
  if (landmarker) return landmarker;

  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
  );

  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: "/assets/ml-models/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });

  return landmarker;
}

/* ------------------------------
   Public API
------------------------------ */

export function updateGaze(landmarks, w, h) {
  
  const leftOuter = lmPx(landmarks, LEFT_EYE_CORNERS[0], w, h);
  const leftInner = lmPx(landmarks, LEFT_EYE_CORNERS[1], w, h);

  const rightOuter = lmPx(landmarks, RIGHT_EYE_CORNERS[0], w, h);
  const rightInner = lmPx(landmarks, RIGHT_EYE_CORNERS[1], w, h);

  const leftIris = irisCenter(landmarks, LEFT_IRIS, w, h);
  const rightIris = irisCenter(landmarks, RIGHT_IRIS, w, h);

  const horizontalRatio =
    ((leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x) +
     (rightIris.x - rightOuter.x) / (rightInner.x - rightOuter.x)) / 2;

  const leftEyeCenterY = (leftOuter.y + leftInner.y) / 2;
  const rightEyeCenterY = (rightOuter.y + rightInner.y) / 2;

  const verticalRatio =
    ((leftIris.y - leftEyeCenterY) +
     (rightIris.y - rightEyeCenterY)) / 2 / h;

  let gaze = "CENTER";
  if (horizontalRatio < 0.42) gaze = "RIGHT";
  else if (horizontalRatio > 0.6) gaze = "LEFT";
  else if (verticalRatio < -0.0075) gaze = "UP";
  else if (verticalRatio > 0.0) gaze = "DOWN";

  return {
    gaze,
    horizontalRatio,
    verticalRatio,
  };
  
}
