import * as THREE from 'three';
import { LEVELS } from './world-layout.js';

export function disposeMeshes(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(object => {
    // Instance matrices/colors have separate GPU buffers from the geometry.
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

export function createWorldGuides() {
  const group = new THREE.Group();
  group.name = 'Coordinate diagram — meters';
  const cursor = new THREE.Mesh(new THREE.OctahedronGeometry(.25), new THREE.MeshBasicMaterial({
    color: '#ffffff', wireframe: true, depthTest: false, depthWrite: false,
  }));
  cursor.renderOrder = 103; group.add(cursor);
  const anchors = new THREE.Group(); group.add(anchors);
  let previousLayout;
  const editorLayer = object => object.layers.set(1); // Helpers never appear in sea reflections.
  group.traverse(editorLayer);
  return {
    group,
    update({ editing, selection, layout }, camera) {
      group.visible = editing;
      const level = LEVELS.find(item => item.y === selection.y) || LEVELS[2];
      cursor.visible = selection.x !== layout.lotus.x || selection.y !== layout.lotus.y || selection.z !== layout.lotus.z;
      cursor.position.set(Number(selection.x) || 0, level.y, Number(selection.z) || 0);
      cursor.scale.setScalar(Math.max(.5, camera.position.distanceTo(cursor.position) * .035));
      if (layout !== previousLayout) {
        disposeMeshes(anchors); anchors.clear();
        for (const marker of layout.markers) {
          const color = LEVELS.find(item => item.y === marker.y).color;
          const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.25), new THREE.MeshBasicMaterial({
            color, depthTest: false, depthWrite: false, transparent: true, opacity: .9,
          }));
          mesh.position.set(marker.x, marker.y, marker.z); mesh.renderOrder = 102;
          mesh.layers.set(1); anchors.add(mesh);
        }
        previousLayout = layout;
      }
      anchors.children.forEach(mesh => mesh.scale.setScalar(Math.max(.5, camera.position.distanceTo(mesh.position) * .025)));
    },
  };
}
