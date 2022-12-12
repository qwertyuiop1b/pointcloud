import * as THREE from "three"
import { fabric } from "fabric"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"


const scene = new THREE.Scene()

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)

document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 10
camera.lookAt(0, 0, 0)
camera.updateProjectionMatrix()
scene.add(camera)


const rectCanvas = document.createElement("canvas")
rectCanvas.width = 200
rectCanvas.height = 200
document.body.appendChild(rectCanvas)
const f = new fabric.Canvas(rectCanvas)
f.backgroundColor = "#FFBE9F"
const rect = new fabric.Rect({
  left: 10,
  top: 10,
  width: 50,
  height: 50,
  fill: "red"
})
f.add(rect)


const texture = new THREE.CanvasTexture(rectCanvas)
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const controls = new OrbitControls(camera, renderer.domElement)


const helper = new THREE.AxesHelper(10)
scene.add(helper)



function render() {
  texture.needsUpdate = true

  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

render()