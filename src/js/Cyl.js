import * as THREE from "three";

//this class generalizes cylinder objects (ie. tree trunk and branches) and contains data such as
//radius, length, and the mesh object itself.
export class Cyl {
  #radius;
  #length;
  #mesh;
  constructor(radius, length) {
    this.#radius = radius;
    this.#length = length;
    this.#mesh = this.getCylinder(radius, length);
  }

  getCylinder(radius, length) {
    const cylGeo = new THREE.CylinderGeometry(radius, radius, length, 6);
    const cylMat = new THREE.MeshStandardMaterial({ color: 0xaf7517 });
    const cyl = new THREE.Mesh(cylGeo, cylMat);
    cyl.castShadow = true;
    return cyl;
  }

  getRadius() {
    return this.#radius;
  }

  getLength() {
    return this.#length;
  }

  getMesh() {
    return this.#mesh;
  }
}
