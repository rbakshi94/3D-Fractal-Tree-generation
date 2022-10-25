import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Cyl } from "./Cyl";

var recursionDepthInput;
var numOfBranchesInput;
var allBranches = []; //this array will store arrays of branches at each recursion level
var trunkRadius = 0.2;
var trunkLength = 10;
var renderer;
var raycaster;
var scene;
var camera;

setupBasicSceneObjs();

createGroundAndAddToScene();

var trunk = addTreeTrunkToScene();

addEvtListenersToUserInputs();

renderer.setAnimationLoop(animate);

function animate() {
  renderer.render(scene, camera);
  var animateBranches = document.querySelector("#animateBranches").checked;
  if (animateBranches) {
    rotateAllBranches();
  }
}

//initializes scene, raycaster, renderer, camera, and camera orbiter
function setupBasicSceneObjs() {
  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer();

  window.addEventListener("pointerup", addChildBranchToClickedBranch);

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x006e8a);

  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  //orbit used for rotating camera about a point (tree trunk in this case)
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.update();
  camera.position.set(0, trunkLength / 2, 11);
  orbit.target.set(0, trunkLength / 2, 0); //camera rotates about mid-height of trunk

  const ambientLight = new THREE.AmbientLight(0x333333, 1.3);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.castShadow = true;
  directionalLight.position.set(-30, 50, 0);
  scene.add(ambientLight);
  scene.add(directionalLight);
}

function addEvtListenersToUserInputs() {
  document
    .getElementById("numOfBranchesInput")
    .addEventListener("input", () => {
      recreateTree();
    });

  document
    .getElementById("recursionDepthInput")
    .addEventListener("input", () => {
      recreateTree();
    });
}

function addTreeTrunkToScene() {
  var trunk = new Cyl(trunkRadius, trunkLength);
  trunk.getMesh().position.y = trunkLength / 2; //moves trunk up to the ground
  scene.add(trunk.getMesh());
  return trunk;
}

function createGroundAndAddToScene() {
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x21982e,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  scene.add(ground);
  ground.rotation.x = THREE.MathUtils.degToRad(-90);
  ground.receiveShadow = true;
}

//recreates tree model
function recreateTree() {
  deleteTreeAndRecreateTrunk(); //will create tree model from scratch

  recursionDepthInput = document.getElementById("recursionDepthInput").value;
  numOfBranchesInput = document.getElementById("numOfBranchesInput").value;

  //i is (recursion level - 1) where recursion level of 0 is tree trunk
  for (let i = 0; i < recursionDepthInput; i++) {
    if (i == 0) {
      allBranches.push(generateChildBranches([trunk]));
    } else {
      allBranches.push(generateChildBranches(allBranches[i - 1]));
    }
  }
}

function deleteTreeAndRecreateTrunk() {
  allBranches = []; //empties branches data
  scene.remove(trunk.getMesh());

  trunk = addTreeTrunkToScene();
}

//takes an array of parent branches at particular recursion level and creates child branches for each
//parent branch
function generateChildBranches(parentBranches) {
  var branchesForThisRecursionDepth = []; //array to hold all child branches for a set of parent branches

  for (let j = 0; j < parentBranches.length; j++) {
    for (let i = 0; i < numOfBranchesInput; i++) {
      branchesForThisRecursionDepth.push(
        addBranchToParentBranch(parentBranches[j])
      );
    }
  }
  return branchesForThisRecursionDepth;
}

function addBranchToParentBranch(parentBranch) {
  var parentBranchMesh = parentBranch.getMesh();
  const childToParentBranchSizeRatio = 0.5;
  var branch = new Cyl(
    parentBranch.getRadius() * childToParentBranchSizeRatio,
    parentBranch.getLength() * childToParentBranchSizeRatio
  );
  var branchMesh = branch.getMesh();
  parentBranchMesh.add(branchMesh);

  //randomly chooses branch location along the length of parent branch
  var distanceAlongCyl = Math.random() * parentBranch.getLength();

  //randomly chooses branch rotation about parent branch axial axis
  var branchAxialRotation = Math.random() * 360;
  branchMesh.rotateY(THREE.MathUtils.degToRad(branchAxialRotation));
  branchMesh.rotateX(THREE.MathUtils.degToRad(60));
  const branchAxialVector = getAxialVectorOfCyl(branchMesh);

  //positions branch's root-end to be on the parent branch. This is needed because branch was
  //previously rotated, and thus isn't aligned to its local axis as before
  branchMesh.position.add(
    branchAxialVector.multiplyScalar(branch.getLength() / 2)
  );

  //positions branch to the root of parent branch
  branchMesh.position.add(
    new THREE.Vector3(0, -parentBranch.getLength() / 2, 0)
  );

  //positions branch along the length of parent branch by distanceAlongCyl
  branchMesh.position.add(new THREE.Vector3(0, distanceAlongCyl, 0));
  return branch;
}

//returns axial vector of branch
function getAxialVectorOfCyl(branchMesh) {
  return new THREE.Vector3(0, 1, 0).applyQuaternion(branchMesh.quaternion);
}

function addChildBranchToClickedBranch(event) {
  const pointer = new THREE.Vector2();
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length && intersects[0].object.type == "Mesh") {
    //only first-intersected object is of interest
    var parentBranchInfo = findBranchObjGivenBranchMesh(intersects[0].object);
    if (parentBranchInfo) {
      //if found
      var newBranch = addBranchToParentBranch(parentBranchInfo.branchObj);
      if (parentBranchInfo.recursionLevel >= allBranches.length) {
        allBranches.push([]); //if adding child branches at recursion level greater than what was generated,
        //blank array is pushed to allBranches data array which shall contain branches of such recursion level
      }
      allBranches[parentBranchInfo.recursionLevel].push(newBranch);
    }
  }
}

//searches allBranches data array to find the branch (Cyl) object corresponding to the branch mesh
function findBranchObjGivenBranchMesh(mesh) {
  if (trunk.getMesh() == mesh) {
    return { branchObj: trunk, recursionLevel: 0 };
  } else {
    for (let i = 0; i < allBranches.length; i++) {
      for (let j = 0; j < allBranches[i].length; j++) {
        if (allBranches[i][j].getMesh() == mesh) {
          return { branchObj: allBranches[i][j], recursionLevel: i + 1 };
        }
      }
    }
  }
}

function rotateAllBranches() {
  for (let i = 0; i < allBranches.length; i++) {
    for (let j = 0; j < allBranches[i].length; j++) {
      allBranches[i][j].getMesh().rotateY(THREE.MathUtils.degToRad(1));
    }
  }
}
