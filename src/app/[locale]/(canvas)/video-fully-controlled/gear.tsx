import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  TextureLoader,
  Texture,
  SphereGeometry,
  Mesh,
  BufferGeometry,
  sRGBEncoding,
  Color,
  Vector2,
  MeshPhongMaterial,
  Shape,
  ExtrudeGeometry,
  AmbientLight,
  DirectionalLight,
  Path,
  EllipseCurve,
  MeshBasicMaterial,
  PlaneGeometry,
  DataTexture,
  NearestFilter,
  LuminanceFormat,
  RGBAFormat,
  RedFormat,
  UnsignedByteType,
  WebGL1Renderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class Main {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  time: number;
  item: Mesh<BufferGeometry, MeshPhongMaterial | MeshBasicMaterial>;
  loader: TextureLoader;
  gear2: Mesh<BufferGeometry, MeshPhongMaterial | MeshBasicMaterial>;
  constructor() {
    this.initialize();
  }

  initialize() {
    this.loader = new TextureLoader();
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.autoClear = false;
    document.body.appendChild(this.renderer.domElement);

    const light = new AmbientLight(new Color(0x666666));

    const dirLight = new DirectionalLight(new Color(0xeeeeee));

    this.renderer.setSize(width, height);

    this.camera = new PerspectiveCamera(45, width / height, 1, 2000);

    this.camera.position.set(0, 0, 20);

    this.scene = new Scene();
    dirLight.position.set(-1, 1, 1);
    this.scene.add(dirLight);
    this.scene.add(light);
    this.camera.lookAt(this.scene.position);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    this.createMeshes();
    this.render();
  }

  createMeshes() {
    return new Promise(async (resolve, reject) => {
      const material = new MeshPhongMaterial({
        color: new Color(1, 1, 1),
        wireframe: false,
      });
      const shape = this.createShape(8, 4, 3.2, 1.3);
      const flowerShape = this.createFlowerShape(6);
      const depth = 2;
      const extrudeGeometry = new ExtrudeGeometry(shape, {
        steps: 1,
        depth,
        bevelEnabled: false,
      });

      const shape2 = this.createShape(7, 3.741657, 2.941657, 1);
      const distance = 4 + 2.941657;

      const gear2G = new ExtrudeGeometry(shape2, {
        steps: 1,
        depth,
        bevelEnabled: false,
      });

      const mesh = new Mesh(extrudeGeometry, material);
      mesh.position.set(-distance / 2, 0, -depth / 2);

      const mesh2 = new Mesh(
        gear2G,
        new MeshPhongMaterial({
          color: 0xccccff,
        })
      );
      mesh2.rotation.z = (-(Math.PI * 2) / 7) * 1.05;
      mesh2.position.set(distance / 2, 0, -depth / 2);

      mesh2.updateMatrix();
      this.gear2 = mesh2;
      this.scene.add(mesh2);
      this.scene.add(mesh);
      this.item = mesh;
      resolve(mesh);
    });
  }

  createFlowerShape(count: number = 1) {
    const shape = new Shape();
    const radius = 6;
    const step = 30;
    let first = false;
    let theta = 0;
    const degStep = (Math.PI * 2) / count / step;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < step; j++) {
        const currentRadius =
          radius * Math.abs(Math.sin((j / step) * Math.PI)) * 0.5 +
          radius * 0.5;
        theta += degStep;
        const currentPos = new Vector2(
          Math.sin(theta) * currentRadius,
          Math.cos(theta) * currentRadius
        );
        if (!first) {
          shape.moveTo(currentPos.x, currentPos.y);
          first = true;
        } else {
          shape.lineTo(currentPos.x, currentPos.y);
        }
      }
    }

    return shape;
  }

  createShape(count = 4, outRadius = 6, inRadius = 4, holeRadius = 2): Shape {
    const shape = new Shape();
    const outDeg = (Math.PI * 2) / count;
    let theta = 0;
    const step = 3 * 10;
    const degStep = outDeg / step;

    let first = false;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < step; j++) {
        theta += degStep;
        const inside = theta % outDeg > (outDeg * 2) / 3;
        let radius = inside ? inRadius : outRadius;
        let radiusOffset = 0;
        if (inside) {
        } else {
          const value = theta % outDeg;
          const radiusDiff = outRadius - inRadius;
          const left = (outDeg * 2) / 3 / 3;
          const right = (((outDeg * 2) / 3) * 2) / 3;
          if (value <= left) {
            radiusOffset = (-(value / left) + 1) * radiusDiff;
          } else if (value > right) {
            radiusOffset = ((value - right) / left) * radiusDiff;
          } else {
          }
        }
        radius = radius - radiusOffset;
        radiusOffset = 0;
        const currentPos = new Vector2(
          radius * Math.sin(theta),
          radius * Math.cos(theta)
        );
        if (!first) {
          shape.moveTo(currentPos.x, currentPos.y);
          first = true;
        } else {
          shape.lineTo(currentPos.x, currentPos.y);
        }
      }
    }
    shape.closePath();
    const hole = new EllipseCurve(
      0,
      0,
      holeRadius,
      holeRadius,
      0,
      2 * Math.PI,
      false,
      0
    );
    const points = hole.getPoints(60);
    shape.holes = [new Path(points)];
    return shape;
  }

  updateRotation() {
    const speed = 0.015;
    if (this.item) {
      this.item.rotation.z -= speed;
    }
    if (this.gear2) {
      this.gear2.rotation.z += (speed * 8) / 7;
    }
  }

  loadImage(url: string) {
    return new Promise<Texture>((res, rej) => {
      this.loader.load(
        url,
        (tex) => {
          tex.anisotropy = 8;
          res(tex);
        },
        (p) => {},
        (error) => {
          console.error(error);
          rej(error);
        }
      );
    });
  }

  render() {
    this.updateRotation();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => {
      this.render();
    });
  }
}
new Main();
