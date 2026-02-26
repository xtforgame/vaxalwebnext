import * as THREE from 'three';

/**
 * Controls camera movement along a closed CatmullRom spline.
 * Evaluate with t ∈ [0, 1] to get position and lookAt target.
 */
export class FlyThroughCamera {
  private curve: THREE.CatmullRomCurve3;
  private _position = new THREE.Vector3();
  private _lookAt = new THREE.Vector3();

  constructor(waypoints: THREE.Vector3[], tension = 0.35) {
    this.curve = new THREE.CatmullRomCurve3(
      waypoints,
      true,          // closed loop
      'catmullrom',
      tension
    );
  }

  /**
   * Evaluate the camera state at parameter t ∈ [0, 1].
   * Returns position on the curve and a lookAt point slightly ahead.
   */
  evaluate(t: number): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const tClamped = ((t % 1) + 1) % 1; // wrap to [0, 1)
    const tAhead = ((tClamped + 0.01) % 1);

    this.curve.getPointAt(tClamped, this._position);
    this.curve.getPointAt(tAhead, this._lookAt);

    return { position: this._position, lookAt: this._lookAt };
  }

  /** Access the underlying curve for debug visualization. */
  getCurve(): THREE.CatmullRomCurve3 {
    return this.curve;
  }
}

/** Default closed-loop flight path waypoints. */
export const DEFAULT_WAYPOINTS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(30, 10, 30),
  new THREE.Vector3(0, 20, 60),
  new THREE.Vector3(-30, 10, 90),
  new THREE.Vector3(-30, -10, 60),
  new THREE.Vector3(0, -20, 30),
  new THREE.Vector3(30, -10, 0),
  new THREE.Vector3(15, 5, -15),
];
