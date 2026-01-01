import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { getDiceFaceValue } from "./useDicePhysics";

describe("useDicePhysics", () => {
  describe("getDiceFaceValue", () => {
    it("returns 1 when die is upright (top face up)", () => {
      const quaternion = new THREE.Quaternion();
      // No rotation - default orientation
      quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      expect(getDiceFaceValue(quaternion, "d6")).toBe(1);
    });

    it("returns 6 when die is upside down (bottom face up)", () => {
      const quaternion = new THREE.Quaternion();
      // Rotate 180 degrees around X axis
      quaternion.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
      expect(getDiceFaceValue(quaternion, "d6")).toBe(6);
    });

    it("returns 4 when rotating -90 around Z (right face becomes up)", () => {
      const quaternion = new THREE.Quaternion();
      // Rotate -90 degrees around Z axis
      quaternion.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
      expect(getDiceFaceValue(quaternion, "d6")).toBe(4);
    });

    it("returns 3 when rotating +90 around Z (left face becomes up)", () => {
      const quaternion = new THREE.Quaternion();
      // Rotate 90 degrees around Z axis
      quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      expect(getDiceFaceValue(quaternion, "d6")).toBe(3);
    });

    it("returns 2 when front face is up", () => {
      const quaternion = new THREE.Quaternion();
      // Rotate -90 degrees around X axis (front side up)
      quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      expect(getDiceFaceValue(quaternion, "d6")).toBe(2);
    });

    it("returns 5 when back face is up", () => {
      const quaternion = new THREE.Quaternion();
      // Rotate 90 degrees around X axis (back side up)
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      expect(getDiceFaceValue(quaternion, "d6")).toBe(5);
    });

    it("returns a value for non-d6 dice types", () => {
      const quaternion = new THREE.Quaternion();
      quaternion.setFromEuler(new THREE.Euler(0.5, 0.5, 0.5));

      const d4Value = getDiceFaceValue(quaternion, "d4");
      expect(d4Value).toBeGreaterThanOrEqual(1);
      expect(d4Value).toBeLessThanOrEqual(4);

      const d20Value = getDiceFaceValue(quaternion, "d20");
      expect(d20Value).toBeGreaterThanOrEqual(1);
      expect(d20Value).toBeLessThanOrEqual(20);
    });
  });
});
