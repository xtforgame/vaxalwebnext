import * as THREE from 'three';

/**
 * Manages a single frame's content: video texture + static fallback image.
 * Handles crossfade between video ↔ static.
 */
export class FrameSceneManager {
  video: HTMLVideoElement;
  videoTexture: THREE.VideoTexture;
  staticTexture: THREE.Texture;
  /** 0 = fully static, 1 = fully video */
  blendFactor = 0;
  private _ready = false;

  constructor(
    videoSrc: string,
    staticSrc: string,
    private textureLoader: THREE.TextureLoader
  ) {
    // Create video element
    this.video = document.createElement('video');
    this.video.src = videoSrc;
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';

    // Video texture
    this.videoTexture = new THREE.VideoTexture(this.video);
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;

    // Static texture
    this.staticTexture = textureLoader.load(staticSrc);
    this.staticTexture.colorSpace = THREE.SRGBColorSpace;

    this.video.addEventListener('canplaythrough', () => {
      this._ready = true;
    }, { once: true });
  }

  get isReady(): boolean {
    return this._ready;
  }

  /**
   * Returns the current display texture based on blend factor.
   * When blendFactor < 0.5, use static; otherwise use video.
   * The actual crossfade is handled by shader uniform, but this
   * provides a simple fallback.
   */
  get activeTexture(): THREE.Texture {
    return this.blendFactor > 0.5 ? this.videoTexture : this.staticTexture;
  }

  play(): void {
    this.video.play().catch(() => {
      // Autoplay blocked — will start on user interaction
    });
  }

  pause(): void {
    this.video.pause();
  }

  /**
   * Smoothly transition to video (for entering a frame).
   */
  fadeToVideo(progress: number): void {
    this.blendFactor = Math.max(0, Math.min(1, progress));
    if (progress > 0.1 && this.video.paused) {
      this.play();
    }
  }

  /**
   * Smoothly transition to static image (for leaving a frame).
   */
  fadeToStatic(progress: number): void {
    this.blendFactor = Math.max(0, Math.min(1, 1 - progress));
    if (progress > 0.9 && !this.video.paused) {
      this.pause();
    }
  }

  dispose(): void {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.videoTexture.dispose();
    this.staticTexture.dispose();
  }
}
