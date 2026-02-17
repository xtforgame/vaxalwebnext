import * as THREE from 'three';

export type TransitionPhase =
  | 'immersed'     // A. 沉浸 — 在畫框內看影片
  | 'exiting'      // B. 退場 — 鏡頭後拉穿出畫框
  | 'overview'     // C. 牆面總覽 — 看到整面牆
  | 'panning'      // D. 平移 — 滑到下一個畫框
  | 'entering';    // E. 進場 — 鏡頭推進新畫框

export interface FrameConfig {
  id: string;
  /** Position on the wall */
  wallPosition: THREE.Vector3;
  /** Hexagon outer radius */
  radius: number;
  /** Frame border thickness */
  borderWidth: number;
  /** Frame extrude depth */
  frameDepth: number;
  /** Video source URL */
  videoSrc: string;
  /** Static image URL (shown when not active) */
  staticSrc: string;
}

export interface TransitionState {
  phase: TransitionPhase;
  /** 0..1 progress within current phase */
  progress: number;
  /** Index of the frame we're leaving */
  fromFrame: number;
  /** Index of the frame we're entering */
  toFrame: number;
}
