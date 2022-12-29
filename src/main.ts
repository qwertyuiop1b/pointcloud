import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader";
import { TransformControls } from "three/examples/jsm/controls/TransformControls"



type CanvasElementWithRenderer = HTMLCanvasElement & {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
};


const DEFAULT_SCALE_X = 1 / 3;
const DEFAULT_SCALE_Y = 0.3;



let mainCamera: null | THREE.PerspectiveCamera = null;
let multpileViewZoom = 50;
let activeBoxPoints = null
let winHeight = window.innerHeight;
let winWidth = window.innerWidth;
const mouse = new THREE.Vector2();
const frontMouse = new THREE.Vector2()
const activeBoxPosition = new THREE.Vector3();

const allPointBoxs: Array<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>> = []


const allDrawBoxs: Array<THREE.Mesh> = []
let activeBox: THREE.Mesh | null = null


const raycaster = new THREE.Raycaster()
const frontRaycaster = new THREE.Raycaster()
frontRaycaster.layers.set(1)


function createPointBox() {
  const geometry = new THREE.SphereGeometry(0.1, 0.1, 16)
  const material = new THREE.MeshBasicMaterial({color: 0x00ff00})
  const sphere = new THREE.Mesh(geometry, material)
  return sphere
}


function createRenderer(cvs: CanvasElementWithRenderer) {
  const renderer = new THREE.WebGLRenderer({
    canvas: cvs,
    antialias: true,
  });
  renderer.setClearColor(0x000000);
  renderer.setSize(cvs.width / window.devicePixelRatio, cvs.height / window.devicePixelRatio, false);
  renderer.setPixelRatio(window.devicePixelRatio)
  cvs.renderer = renderer;
  return renderer;
}

function loadPoints(): Promise<THREE.Points> {
  return new Promise((resolve, reject) => {
    const loader = new PCDLoader();
    loader.load(
      "/000053.pcd",
      (points) => {
        resolve(points);
      },
      () => {},
      (err) => {
        reject(err.message);
      }
    );
  });
}

function updateCvsList(cvsList: Array<CanvasElementWithRenderer>) {
  cvsList.forEach((c, idx) => {
    let scaleX = DEFAULT_SCALE_X,
      scaleY = DEFAULT_SCALE_Y;
    if (idx === 0) {
      scaleX = 1;
      scaleY = 0.7;
    }
    c.width = scaleX * winWidth;
    c.height = scaleY * winHeight;
    c.renderer.setSize(c.width / window.devicePixelRatio, c.height / window.devicePixelRatio, false);
    c.renderer.setPixelRatio(window.devicePixelRatio)
  });
}

const viewContainer = document.querySelector(".views") as HTMLDivElement;

const mainCanvas = document.querySelector(
  "#main-scene"
) as CanvasElementWithRenderer;
const frontCanvas = document.querySelector(
  "#front-scene"
) as CanvasElementWithRenderer;
const topCanvas = document.querySelector(
  "#top-scene"
) as CanvasElementWithRenderer;
const sideCanvas = document.querySelector(
  "#side-scene"
) as CanvasElementWithRenderer;


const allCanvas = [mainCanvas, frontCanvas, topCanvas, sideCanvas];

allCanvas.forEach((cvs, idx) => {
  let scaleX = DEFAULT_SCALE_X,
    scaleY = DEFAULT_SCALE_Y;
  if (idx === 0) {
    scaleX = 1;
    scaleY = 0.7;
  }
  cvs.width = scaleX * winWidth;
  cvs.height = scaleY * winHeight;
  createRenderer(cvs);
});


const allCameras: Array<{
  type: "perspectiveCamera" | "orthographicCamera";
  eye: number[];
  up: number[];
  fov?: number;
  updateCamera: (camera: any, target: THREE.Vector3) => void;
  canvas: CanvasElementWithRenderer;
  camera: null | THREE.Camera;
}> = [
  {
    type: "perspectiveCamera",
    eye: [0, 0, 30],
    up: [0, 1, 0],
    fov: 75,
    updateCamera(camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
      camera.lookAt(target);
    },
    canvas: mainCanvas,
    camera: null,
  },
  {
    type: "orthographicCamera",
    eye: [0, 0, 10],
    up: [0, 1, 0],
    updateCamera(camera: THREE.OrthographicCamera, target: THREE.Vector3) {
      camera.zoom = multpileViewZoom;
      camera.position.set(target.x, target.y, target.z + 10)
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    },
    canvas: frontCanvas,
    camera: null,
  },
  {
    type: "orthographicCamera",
    eye: [0, 10, 0],
    up: [0, 0, 1],
    updateCamera(camera: THREE.OrthographicCamera, target: THREE.Vector3) {
      camera.zoom = multpileViewZoom;
      camera.position.set(target.x, target.y + 10, target.z)
      camera.lookAt(target)
      camera.updateProjectionMatrix();
    },
    canvas: topCanvas,
    camera: null,
  },
  {
    type: "orthographicCamera",
    eye: [10, 0, 0],
    up: [0, 0, 1],
    updateCamera(camera: THREE.OrthographicCamera, target: THREE.Vector3) {
      camera.zoom = multpileViewZoom;
      camera.position.set(target.x + 10, target.y, target.z)
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    },
    canvas: sideCanvas,
    camera: null,
  },
];


const scene = new THREE.Scene();

const helper = new THREE.AxesHelper(10);
scene.add(helper);

loadPoints().then(points => {
  points.layers.enable(0)
  points.layers.enable(1)
  points.layers.enable(2)
  points.layers.enable(3)
  scene.add(points)
});

allCameras.forEach((cameraItem, idx) => {
  const { eye, up, fov, canvas } = cameraItem;
  if (cameraItem.type === "perspectiveCamera") {
    const camera = new THREE.PerspectiveCamera(
      fov,
      canvas.width / canvas.height,
      0.1,
      100
    );
    camera.position.fromArray(eye);
    camera.up.fromArray(up);
    scene.add(camera);
    cameraItem.camera = camera;
    mainCamera = camera;
    cameraItem.canvas.camera = camera;

  } else if (cameraItem.type === "orthographicCamera") {
    const camera = new THREE.OrthographicCamera(
      -canvas.width / 2,
      canvas.width / 2,
      canvas.height / 2,
      -canvas.height / 2,
      0.1,
      100
    );
    camera.zoom = multpileViewZoom;
    camera.position.fromArray(eye);
    camera.up.fromArray(up);
    camera.updateProjectionMatrix();
    camera.layers.set(idx)
    scene.add(camera);
    cameraItem.camera = camera;
    cameraItem.canvas.camera = camera;
  }
});


// add controls
const controls = new OrbitControls(mainCanvas.camera!, mainCanvas);
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


const transformControls = new TransformControls(mainCamera!, mainCanvas)
transformControls.addEventListener( 'dragging-changed', function ( event ) {
  console.log("dragging-changed", event)
  controls.enabled = ! event.value;
});
transformControls.setSize(0.7)
scene.add(transformControls)



const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
const boxEdgeGeometry = new THREE.EdgesGeometry(boxGeometry);
const boxMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.2,
});



function render() {
  controls?.update();
  raycaster.setFromCamera(mouse, mainCamera!)

  

  allCameras.forEach((camera) => {
    if (camera.type === "orthographicCamera") {
      camera.updateCamera(camera.camera, activeBoxPosition);
    }
    const { renderer } = camera.canvas as CanvasElementWithRenderer;
    renderer.render(scene, camera.camera as THREE.Camera);
  });
  requestAnimationFrame(render);
}

window.addEventListener("resize", () => {
  winHeight = window.innerHeight;
  winWidth = window.innerWidth;
  updateCvsList(allCanvas)
});

// save mouse world position
const vec = new THREE.Vector3(); // create once and reuse
const pos = new THREE.Vector3(); // create once and reuse

const btnDraw = document.querySelector("#draw")!;
btnDraw.addEventListener("click", () => {
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  const boxLineMaterial = new THREE.LineBasicMaterial({color: 0xff0000})
  const line = new THREE.LineSegments(boxEdgeGeometry, boxLineMaterial)
  line.layers.enable(1)
  line.layers.enable(2)
  line.layers.enable(3)
  box.add(line)
  box.position.set(pos.x, pos.y, pos.z);
  box.layers.enable(1)
  box.layers.enable(2)
  box.layers.enable(3)
  scene.add(box);


  const mainCanvasMouseMove = () => {
    box.position.set(pos.x, pos.y, pos.z);
    activeBoxPosition.set(pos.x, pos.y, pos.z);
    
  };

  mainCanvas.addEventListener("mousemove", mainCanvasMouseMove);

  mainCanvas.addEventListener("contextmenu", (evt) => {
    evt.preventDefault();
    mainCanvas.removeEventListener("mousemove", mainCanvasMouseMove);

    console.log("boxGeometry", boxGeometry)




    const pointBox = createPointBox()
    pointBox.layers.disable(0)
    pointBox.layers.enable(1)
    pointBox.layers.enable(2)
    pointBox.layers.enable(3)

    const allVectors: Array<THREE.Vector3> = []

    const position = box.geometry.attributes.position
    
    for (let i = 0, l = position.count; i < l; i++) {
      const vector = new THREE.Vector3()
      vector.fromBufferAttribute( position, i );
      vector.applyMatrix4( box.matrixWorld );
      const result = allVectors.find(v => {
        return v.x === vector.x && v.y === vector.y && v.z === vector.z
      })
      if (!result) {
        const temp = pointBox.clone()
        temp.position.fromArray(vector.toArray())
        // @ts-ignore
        temp.data = {index: i}
        scene.add(temp)
        
        allPointBoxs.push(temp)
        allVectors.push(vector)
      }
    }
    console.log(allVectors.length)


    // pointBox.position.set(activeBoxPosition.x + 1, activeBoxPosition.y + 1, activeBoxPosition.z + 1);
    // scene.add(pointBox)

    // console.log(box)


    // 创建顶点
    // const boxPoints = new THREE.Points(boxGeometry, new THREE.PointsMaterial({
    //   color: 0x0000ff,
    //   size: 8,
    // }))
    // boxPoints.layers.disable(0)
    // boxPoints.layers.enable(1)
    // boxPoints.layers.enable(2)
    // boxPoints.layers.enable(3)
    // activeBoxPoints = boxPoints
    // box.add(boxPoints)
    

    transformControls.attach(box)
    allDrawBoxs.push(box)
    
  });
});

const btnReset = document.querySelector("#reset")!;
btnReset.addEventListener("click", () => {
  controls?.reset();
});

mainCanvas.addEventListener("mousemove", (evt: MouseEvent) => {
  mouse.x = (evt.clientX / mainCanvas.width) * 2 - 1;
  mouse.y = -(evt.clientY / mainCanvas.height) * 2 + 1;

  vec.set(mouse.x, mouse.y, 0.5);
  vec.unproject(mainCamera!);
  vec.sub(mainCamera!.position).normalize();
  const distance = -mainCamera!.position.z / vec.z;
  pos.copy(mainCamera!.position).add(vec.multiplyScalar(distance));

});


let mouseDown = false
frontCanvas.addEventListener("mousemove", (evt: MouseEvent) => {
  const { left, top } = frontCanvas.getBoundingClientRect()
  frontMouse.x = ((evt.clientX - left) / frontCanvas.width) * 2 - 1;
  frontMouse.y = -((evt.clientY - top) / frontCanvas.height) * 2 + 1;

  frontRaycaster.setFromCamera(frontMouse, frontCanvas.camera!)

  const pss = frontRaycaster.intersectObjects(allPointBoxs)
  if (pss.length) {
    console.log("pss", pss)
    frontCanvas.style.cursor = "move"
  } else {
    frontCanvas.style.cursor = "auto"
  }

})


const handleMouseDown = evt => {
  mouseDown = true
  console.log(mouseDown)

  const handleMove = () => {
    console.log("move....")
  }

  const handleUp = () => {
    frontCanvas.removeEventListener("mousemove", handleMove)
    frontCanvas.removeEventListener("mouseup", handleUp)
  }

  frontCanvas.addEventListener("mousemove",handleMove)

  frontCanvas.addEventListener("mouseup", handleUp)
}

frontCanvas.addEventListener("mousedown", handleMouseDown)







topCanvas.addEventListener("mousemove", (evt: MouseEvent) => {

})


sideCanvas.addEventListener("mousemove", (evt: MouseEvent) => {

})


mainCanvas.addEventListener("click", () => {
  const intersects = raycaster.intersectObjects(allDrawBoxs, false);

  if (activeBox) {
    // @ts-ignore
    activeBox.children[0]!.material.color = new THREE.Color(0xff0000)
    // @ts-ignore
    activeBox.children[0]!.material.needsUpdate = true

    transformControls.detach()
  }


  if (intersects.length) {
    activeBox = intersects[0].object as THREE.Mesh
    const material = (activeBox.children[0] as THREE.Mesh).material as THREE.LineBasicMaterial
    material.color = new THREE.Color(0x00ff00)
    material.needsUpdate = true
    activeBoxPosition.set(activeBox.position.x, activeBox.position.y, activeBox.position.z)
    transformControls.attach(activeBox)
  }

})

mainCanvas.addEventListener("contextmenu", (evt) => {
  evt.preventDefault()

})


viewContainer.addEventListener("wheel", (evt: WheelEvent) => {
  evt.preventDefault();
  if (evt.deltaY > 0) {
    multpileViewZoom += 1;
  } else {
    multpileViewZoom -= 1;
  }
  
});

render();


window.addEventListener("keydown", (evt: KeyboardEvent) => {
  console.log(evt.key)
  switch (evt.key) {
    case "s":
      transformControls.setMode("scale")
      break
    case "t":
      transformControls.setMode("translate")
      break
    case "r":
      transformControls.setMode("rotate")
      break
    case "Escape":
      transformControls.reset()
      break
    
  }
})


