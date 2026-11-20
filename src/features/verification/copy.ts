export const POSES: Record<string, { label: string; how: string }> = {
  peace_sign: {
    label: "Peace sign",
    how: "Hold up a peace sign next to your face.",
  },
  thumbs_up: { label: "Thumbs up", how: "Give a thumbs up next to your face." },
  hand_on_chin: { label: "Hand on chin", how: "Rest your chin on your hand." },
  touch_ear: { label: "Touch your ear", how: "Touch one ear with your hand." },
  wave: { label: "Wave", how: "Wave at the camera with an open hand." },
  point_up: { label: "Point up", how: "Point one finger up beside your face." },
};

export function poseText(pose: string): { label: string; how: string } {
  return POSES[pose] ?? { label: "Pose", how: "Copy the pose shown." };
}

const ERRORS: Record<string, string> = {
  already_verified: "You're already verified.",
  needs_photos:
    "Add at least one photo of yourself first, so we have something to compare with.",
  rate_limited: "You've tried a few times today. Please try again tomorrow.",
  not_allowed: "Verification isn't available for your account right now.",
  not_found: "That verification has expired. Please start again.",
  invalid_path: "That upload didn't work. Please try again.",
};

export function verificationErrorText(raw: string | null | undefined): string {
  const key = Object.keys(ERRORS).find((k) => (raw ?? "").includes(k));
  return key ? ERRORS[key] : "Something went wrong. Please try again.";
}
