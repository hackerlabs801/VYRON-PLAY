import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {DRACOLoader} from './vendor/loaders/DRACOLoader.js';

let original=null,distant=null,contactGeometry=null,contactMaterial=null;
export async function loadVehicle(progress=()=>{}){
 if(original)return;
 const draco=new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(1);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 try{
  const asset=await loader.loadAsync('./assets/cars/lamborghini_aventador.glb',e=>progress(e.total?Math.round(e.loaded/e.total*80):40));
  original=asset.scene;
  const response=await fetch('./assets/cars/grounding.json');if(!response.ok)throw new Error('Vehicle grounding data missing.');const grounding=await response.json();
  // Only rigid orientation, uniform scale and translation are changed; never the supplied mesh or materials.
  function normalize(source){const normalized=new THREE.Group();source.quaternion.fromArray(grounding.quaternion);source.position.set(-grounding.center[0],-grounding.center[1],-grounding.center[2]);normalized.add(source);normalized.scale.setScalar(grounding.scale);return normalized;}
  original=normalize(original);
  const low=await loader.loadAsync('./assets/cars/aventador-distance.glb');
  let material;original.traverse(o=>{if(o.isMesh)material=o.material;});if(!material?.map||!material?.roughnessMap)throw new Error('Original vehicle textures failed to decode. Reload to retry.');
  low.scene.traverse(o=>{if(o.isMesh)o.material=material;});distant=normalize(low.scene);
  for(const model of [original,distant])model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=true;if(o.material.map)o.material.map.anisotropy=8;}});
  progress(100);
 }finally{draco.dispose();}
}
export function makeCar(){
 if(!original)throw new Error('Aventador model is not loaded.');
 const car=new THREE.Group();const exact=original.clone(true),lod=distant.clone(true);car.add(exact,lod);lod.visible=false;
 if(!contactMaterial){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.82)');gradient.addColorStop(.55,'rgba(0,0,0,.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});contactGeometry=new THREE.PlaneGeometry(1,1);}
 const shadow=new THREE.Mesh(contactGeometry,contactMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.004;shadow.scale.set(2.5,4.8,1);car.add(shadow);
 for(const x of [-.72,.72])for(const z of [-1.55,1.18]){const patch=new THREE.Mesh(contactGeometry,contactMaterial);patch.rotation.x=-Math.PI/2;patch.position.set(x,.005,z);patch.scale.set(.55,.8,1);car.add(patch);}

 car.userData={sharedVehicle:true,exact,lod,wheels:[],kind:'aventador'};
 return car;
}
export function setVehicleDetail(car,exact){car.userData.exact.visible=exact;car.userData.lod.visible=!exact;}
export const CAMERA_VIEWS=[
 {name:'CLOSE CHASE',distance:5.6,height:1.15,look:6,targetHeight:.78,fov:55},
 {name:'ROAD CHASE',distance:8.3,height:2.9,look:7,targetHeight:1.0,fov:57},
 {name:'HOOD',distance:-1.0,height:1.18,look:24,targetHeight:1.15,fov:67},
 {name:'BUMPER',distance:-2.45,height:.48,look:28,targetHeight:.55,fov:72,hideCar:true},
 {name:'REAR DETAIL',distance:4.6,height:.82,look:3,targetHeight:.8,fov:55}
];
