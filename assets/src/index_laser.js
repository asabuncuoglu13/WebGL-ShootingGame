// Common Variables for Graphics
var scene, camera, innerColor, renderer, controls = null;
var starField, tunnelMesh, tunnelTexture = null;
var projector, mouse = { x: 0, y: 0 }, INTERSECTED;
var pos = new THREE.Vector3();
var selectedFaces = [];
var onRenderFcts = [];
var mouseSphere = [];
var targetList = [];
var baseColor = new THREE.Color(0x44dd66);
var highlightedColor = new THREE.Color(0xddaa00);
var selectedColor = new THREE.Color(0x4466dd);
var ballMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });
var sphere, laserBeam, laserobject;
var monster = null;
var bird = null;
var quat = new THREE.Quaternion();
var time = new THREE.Clock();
var rigidBodies = [];
var score = 0;
var hitted = false;

var scoreElement = document.getElementById("score");
var scoreNode = document.createTextNode("");
scoreElement.appendChild(scoreNode);

// Helper function to convert degrees to radian
function deg2rad(_degrees) {
  return (_degrees * Math.PI / 180);
}

// initialize the objects, camera, scene ...
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  innerColor = 0x2222ff;
  if (Detector.webgl)
    renderer = new THREE.WebGLRenderer({ antialias: true });
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setClearColor(0x000000, 0); // background

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = -100;
  camera.lookAt(scene.position);
  //scene.fog = new THREE.Fog(0x000000, 100, 700);

  // Mesh
  var group = new THREE.Group();
  scene.add(group);

  // Lights
  var light = new THREE.AmbientLight(0x404040); // soft white light
  scene.add(light);

  var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 128, 128);
  scene.add(directionalLight);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  // Load texture first
  THREE.ImageUtils.crossOrigin = '';
  tunnelTexture = THREE.ImageUtils.loadTexture('./assets/electric.jpg');
  tunnelTexture.wrapT = tunnelTexture.wrapS = THREE.RepeatWrapping;
  tunnelTexture.repeat.set(1, 2);

  // Tunnel Mesh
  tunnelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(50, 50, 1024, 16, 32, true),
    new THREE.MeshBasicMaterial({
      color: innerColor,
      ambient: innerColor,
      transparent: true,
      alphaMap: tunnelTexture,
      shininess: 0,
      side: THREE.BackSide,
    })
  );
  tunnelMesh.rotation.x = deg2rad(90);
  tunnelMesh.position.z = 128;
  scene.add(tunnelMesh);

  var loader = new THREE.ObjectLoader();

  loader.load("monster/monster.json",
    function (obj) {
      monster = obj;
      targetList.push(monster);
      monster.position.z = 5;
      monster.rotation.x = - Math.PI / 2;
      monster.rotation.z = - Math.PI / 2;
      monster.rotation.y = - Math.PI / 2;
      scene.add(monster);
    }
  );

  var newSphereGeom = new THREE.SphereGeometry(0.2, 0.2, 0.2);
  sphere = new THREE.Mesh(newSphereGeom, new THREE.MeshBasicMaterial({ color: 0x2266dd }));
  scene.add(sphere);
  mouseSphere.push(sphere);

  // Starfield
  var geometry = new THREE.Geometry();
  for (i = 0; i < 5000; i++) {
    var vertex = new THREE.Vector3();
    vertex.x = Math.random() * 3000 - 1500;
    vertex.y = Math.random() * 3000 - 1500;
    vertex.z = Math.random() * 200 - 100;
    geometry.vertices.push(vertex);
  }
  starField = new THREE.PointCloud(geometry, new THREE.PointCloudMaterial({
    size: 0.5,
    color: 0xffff99
  })
  );
  scene.add(starField);
  starField.position.z = 400;

  projector = new THREE.Projector();
}

function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

function update() {

  var deltaTime = time.getDelta();

  if (monster.position.z < -100) {
    hitted = false;
    var randNumZ = getRandomArbitrary(80, 150);
    monster.position.z = randNumZ;
    var randNumX = getRandomArbitrary(-20, 20);
    monster.position.x = randNumX;
    var randNumY = getRandomArbitrary(-20, 20);
    monster.position.y = randNumY;
  }

  if (hitted) {
    monster.position.x -= getRandomArbitrary(-2, 2);
    monster.position.y -= 1;
  }

  checkIntersection();
  CheckMouseSphere();
  controls.update();

  if (monster) {
    monster.position.z -= 1;
  }

  if (laserobject) {
    laserobject.position.z += 1;
  }

}

function checkIntersection() {
  // find intersections

  // create a Ray with origin at the mouse position
  //   and direction into the scene (camera direction)
  var vector = new THREE.Vector3(laserobject.position.x, laserobject.position.y, 1);
  vector.unproject(camera);
  var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  // create an array containing all objects in the scene with which the ray intersects
  var intersects = ray.intersectObjects(targetList, true);

  // INTERSECTED = the object in the scene currently closest to the camera 
  //		and intersected by the Ray projected from the mouse position 	

  // if there is one (or more) intersections
  if (intersects.length > 0) {	// case if mouse is not currently over an object
    if (INTERSECTED == null) {
      INTERSECTED = intersects[0];
    }
    else {	// if thse mouse is over an object
      INTERSECTED = intersects[0];
    }
    // upsdate mouseSphere coordinates and update colors
    mouseSphereCoords = [INTERSECTED.point.x, INTERSECTED.point.y, INTERSECTED.point.z];

  }
  else // there are no intersections
  {
    INTERSECTED = null;
    mouseSphereCoords = null;

  }
}

function CheckMouseSphere() {
  // if the coordinates exist, make the sphere visible
  if (mouseSphereCoords != null) {
    //console.log(mouseSphereCoords[0].toString()+","+mouseSphereCoords[1].toString()+","+mouseSphereCoords[2].toString());
    mouseSphere[0].position.set(mouseSphereCoords[0], mouseSphereCoords[1], mouseSphereCoords[2]);
    mouseSphere[0].visible = true;
  }
  else { // otherwise hide the sphere
    mouseSphere[0].visible = false;
  }
}

function render() {

  camera.lookAt(scene.position);
  starField.rotation.z += 0.005;

  var innerShift = Math.abs(Math.cos(((time.getElapsedTime() + 2.5) / 200)));
  var outerShift = Math.abs(Math.cos(((time.getElapsedTime() + 5) / 100)));

  starField.material.color.setHSL(Math.abs(Math.cos((time.getElapsedTime() / 10))), 1, 0.8);
  tunnelMesh.material.color.setHSL(Math.abs(Math.cos((time.getElapsedTime() / 10))), 1, 0.5);
  //cubeMesh.material.ambient.setHSL(Math.abs(Math.cos((time.getElapsedTime() / 10))), 1, 0.5);

  tunnelTexture.offset.y = time.getElapsedTime() / 2;
  tunnelTexture.offset.x = time.getElapsedTime() / 6;
  //controls.update();
  renderer.render(scene, camera);
};

// Mouse and resize events
window.addEventListener('resize', onWindowResize, false);
document.addEventListener('mousemove', onDocumentMouseMove, false);
document.addEventListener('mousedown', onDocumentMouseDown, false);

function onDocumentMouseDown(event) {
  scene.remove(laserobject);
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  
  laserBeam = new LASER.LaserBeam();
  laserobject = laserBeam.object3d;
  scene.add(laserobject);
  laserobject.position.z = -95;
  laserobject.position.x = -mouse.x * 25;
  laserobject.position.y = mouse.y * 25;

  var vector = new THREE.Vector3(mouse.x, mouse.y, 1).unproject(camera);
  //var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  var laserPros = new LASER.LaserPros(laserBeam);
  onRenderFcts.push(function (delta, now) {
    laserPros.update(delta, now)
  });
  var angle = Math.atan(Math.abs(mouse.y / mouse.x));
  if (mouse.x > 0 && mouse.y > 0)
    laserobject.rotation.z = - angle;
  else if (mouse.x < 0 && mouse.y > 0)
    laserobject.rotation.z = - Math.PI + angle;
  else if (mouse.x < 0 && mouse.y < 0)
    laserobject.rotation.z = - Math.PI - angle;
  else
    laserobject.rotation.z = -2 * Math.PI + angle;
  //laserobject.rotation.y	= deg2rad( Math.atan(mouse.y / mouse.x));

  var intersects = ray.intersectObjects(targetList, true);
  console.log("mouse.x = " + mouse.x + "mouse.y = " + mouse.y);
  if (intersects.length > 0) {
    console.log("hitting something");
    hitted = true;
    score += 10;
    scoreNode.value = score;
  }
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}