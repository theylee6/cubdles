import { describe, expect, it } from "vitest";
import { POSES, poseText, verificationErrorText } from "@/features/verification/copy";

describe("verification copy", () => {
  it("has instructions for every pose the database can choose", () => {
    for (const p of ["peace_sign", "thumbs_up", "hand_on_chin", "touch_ear", "wave", "point_up"]) expect(POSES[p]?.how).toBeTruthy();
    expect(poseText("unknown").label).toBe("Pose");
  });
  it("explains errors", () => {
    expect(verificationErrorText("P0001: needs_photos")).toMatch(/photo/);
    expect(verificationErrorText("weird")).toMatch(/went wrong/);
  });
});
