import "./style2.css"

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader";
import { TransformControls } from "three/examples/jsm/controls/TransformControls"


function addPointsToScene(scene: THREE.Scene): Promise<THREE.Points> {
  return new Promise((resolve, reject) => {
    const loader = new PCDLoader();
    loader.load(
      "/000053.pcd",
      (points) => {
        scene.add(points);
        resolve(points);
      },
      () => {},
      (err) => {
        reject(err.message);
      }
    );
  });
}


const SCALE_Y = 0.3, SCALE_X = 1 / 3;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}
const mouse = new THREE.Vector2();
const activeBoxPosition = new THREE.Vector3();
const allDrawBoxs: Array<THREE.Mesh> = []
let activeBox: THREE.Mesh | null = null
const activePosition = new THREE.Vector3()


const canvas = document.querySelector("#c") as HTMLCanvasElement
canvas.width = sizes.width
canvas.height = sizes.height

type ViewItem = {
  type: "perspectiveCamera" | "orthographicCamera";
  left: number;
  bottom: number;
  width: number;
  height: number;
  eye: number[]
  up: number[]
  fov?:number;
  camera: null | THREE.PerspectiveCamera
  updateCamera: (camera: any, target: THREE.Vector3) => void
}


const views: Array<ViewItem> = [
  {
    type: "perspectiveCamera",
    left: 0,
    bottom: SCALE_Y,
    width: 1.0,
    height: 1 - SCALE_Y,

    eye: [0, 0, 30],
    up: [0, 1, 0],
    fov: 75,
    camera: null,
    updateCamera(camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
      camera.lookAt(target)
    }
  },
  {
    left: 0,
    bottom: 0,
    fov: 75,
    width: SCALE_X,
    height: SCALE_Y,
    type: "orthographicCamera",
    eye: [0, 0, 10],
    up: [0, 1, 0],
    updateCamera(camera: THREE.OrthographicCamera, target: THREE.Vector3) {
      camera.position.set(target.x, target.y, target.z + 10)
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    },
    camera: null,

  },
  {
    left: SCALE_X,
    bottom: 0,
    fov: 75,
    width: SCALE_X,
    height: SCALE_Y,
    type: "orthographicCamera",
    eye: [0, 10, 0],
    up: [0, 0, 1],
    updateCamera(camera: THREE.OrthographicCamera, target: THREE.Vector3) {
      camera.position.set(target.x, target.y + 10, target.z)
      camera.lookAt(target)
      camera.updateProjectionMatrix();
    },
    camera: null,
  },
  {
    left: SCALE_X * 2,
    bottom: 0,
    fov: 75,
    width: SCALE_X,
    height: SCALE_Y,
    type: "orthographicCamera",
    eye: [10, 0, 0],
    up: [0, 1, 0],
    updateCamera(camera: THREE.OrthographicCamera, target: THREE.Vector3) {
      camera.position.set(target.x + 10, target.y, target.z)
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    },
    camera: null,
  },
]


const scene = new THREE.Scene()

const renderer = new THREE.WebGLRenderer({
  canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(window.devicePixelRatio)

// const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 200)
// camera.position.z = 30
// scene.add(camera)
let mainCamera: null | THREE.PerspectiveCamera = null

views.forEach((view, index) => {

    const camera = new THREE.PerspectiveCamera( view.fov, sizes.width / sizes.height, 1, 100 );
    camera.position.fromArray( view.eye );
		camera.up.fromArray( view.up );
    view.camera = camera
    if (index === 0) {
      mainCamera = camera
    }
  
})


addPointsToScene(scene)

const helper = new THREE.AxesHelper(10);
scene.add(helper);

// add controls
const controls = new OrbitControls(mainCamera!, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.listenToKeyEvents(window); // optional
controls.keys = {
  LEFT: "KeyA", //left arrow
  UP: "KeyW", // up arrowaa
  RIGHT: "KeyD", // right arrow
  BOTTOM: "KeyS", // down arrow
};
controls.keyPanSpeed = 30.0;


const transformControls = new TransformControls(mainCamera!, canvas)
transformControls.addEventListener( 'dragging-changed', function ( event ) {
  console.log("dragging-changed", event)
  controls.enabled = ! event.value;
});
transformControls.setSize(0.7)
scene.add(transformControls)


const boxGeometry = new THREE.BoxGeometry(1, 3, 1);
const boxEdgeGeometry = new THREE.EdgesGeometry(boxGeometry);
const boxMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.2,
});


function render() {
  controls.update();
  for ( let ii = 0; ii < views.length; ++ ii ) {

    const view = views[ ii ];
    const camera = view.camera

    view.updateCamera(camera, activePosition);

    const left = Math.floor( sizes.width * view.left );
    const bottom = Math.floor( sizes.height * view.bottom );
    const width = Math.floor( sizes.width * view.width );
    const height = Math.floor( sizes.height * view.height );

    renderer.setViewport( left, bottom, width, height );
    renderer.setScissor( left, bottom, width, height );
    renderer.setScissorTest( true );

    camera!.aspect = width / height;
    
    camera!.updateProjectionMatrix();
    renderer.render( scene, camera! );

  }
  requestAnimationFrame(render);
}



// save mouse world position
const vec = new THREE.Vector3(); // create once and reuse
const pos = new THREE.Vector3(); // create once and reuse

const btnDraw = document.querySelector("#draw")!;
btnDraw.addEventListener("click", () => {
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  const boxLineMaterial = new THREE.LineBasicMaterial({color: 0xff0000})
  const line = new THREE.LineSegments(boxEdgeGeometry, boxLineMaterial)
  box.add(line)
  box.position.set(pos.x, pos.y, pos.z);
  scene.add(box);


  const mainCanvasMouseMove = () => {
    box.position.set(pos.x, pos.y, pos.z);
    activeBoxPosition.set(pos.x, pos.y, pos.z);
    
  };

  canvas.addEventListener("mousemove", mainCanvasMouseMove);

  canvas.addEventListener("contextmenu", (evt) => {
    evt.preventDefault();
    canvas.removeEventListener("mousemove", mainCanvasMouseMove);
    transformControls.attach(box)

    allDrawBoxs.push(box)

  });
});

const btnReset = document.querySelector("#reset")!;
btnReset.addEventListener("click", () => {
  controls.reset();
});

canvas.addEventListener("mousemove", (evt: MouseEvent) => {
  mouse.x = (evt.clientX / sizes.width) * 2 - 1;
  mouse.y = -(evt.clientY / sizes.height) * 2 + 1;

  vec.set(mouse.x, mouse.y, 0.5);
  vec.unproject(mainCamera!);
  vec.sub(mainCamera!.position).normalize();
  const distance = -mainCamera!.position.z / vec.z;
  pos.copy(mainCamera!.position).add(vec.multiplyScalar(distance));

});


window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  mainCamera!.aspect = sizes.width / sizes.height
  mainCamera!.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
});


render()