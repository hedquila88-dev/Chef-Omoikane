// Shared image capture/quality settings used across all camera & upload flows in the app.
// Keeping these in one place avoids different features drifting out of sync.

export const CAMERA_VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 }
};

export const JPEG_QUALITY = 0.55;

// Live camera shots (optimized for fast inference and token saving)
export const MAX_DIM_LIVE_SHOT = 1024;

// Uploaded / pasted photos - 1024px is optimal for vision tokens and fast uploads
export const MAX_DIM_UPLOAD = 1024;
