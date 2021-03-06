// Common Variables for Graphics
var scene, camera, innerColor, renderer, controls = null;
var starField, tunnelMesh, tunnelTexture = null;
var projector, mouse = { x: 0, y: 0 }, INTERSECTED;
var pos = new THREE.Vector3();
var selectedFaces = [];
var mouseSphere = [];
var targetList = [];
var baseColor = new THREE.Color(0x44dd66);
var highlightedColor = new THREE.Color(0xddaa00);
var selectedColor = new THREE.Color(0x4466dd);
var ballMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });
var sphere;
var monster = null;
var bird = null;
var quat = new THREE.Quaternion();
var time = new THREE.Clock();
var rigidBodies = [];
var hitted = false;

// Common Variables for Physics
var gravityConstant = -9.8;
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var physicsWorld;
var terrainBody;
var margin = 0.05;
var dynamicObjects = [];
var transformAux1 = new Ammo.btTransform();

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

  var monsterMass = 2.5;
  var monsterLength = 1.2;
  var monsterDepth = 0.6;
  var monsterHeight = monsterLength * 0.5;

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
  initPhysics();
}

function initPhysics() {
  collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
  physicsWorld.setGravity( new Ammo.btVector3( 0, -0.8, 0 ) );
}

function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

function update() {

  var deltaTime = time.getDelta();
  updatePhysics(deltaTime);

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


  checkHighlight();
  CheckMouseSphere();
  controls.update();

  if (monster) {
    monster.position.z -= 1;
  }
  if (bird) {
    bird.position.z -= 1;
  }
}

function checkHighlight() {
  // find intersections

  // create a Ray with origin at the mouse position
  //   and direction into the scene (camera direction)
  var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
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

function createRigidBody(threeObject, physicsShape, mass, pos, quat) {

  threeObject.position.copy(pos);
  threeObject.quaternion.copy(quat);

  var transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  var motionState = new Ammo.btDefaultMotionState(transform);

  var localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
  var body = new Ammo.btRigidBody(rbInfo);

  threeObject.userData.physicsBody = body;

  scene.add(threeObject);

  if (mass > 0) {

    rigidBodies.push(threeObject);

    // Disable deactivation
    body.setActivationState(4);

  }

  physicsWorld.addRigidBody(body);

  return body;
}
function updatePhysics(deltaTime) {

  // Step world
  physicsWorld.stepSimulation(deltaTime, 10);

  // Update rigid bodies
  for (var i = 0, il = rigidBodies.length; i < il; i++) {
    var objThree = rigidBodies[i];
    var objPhys = objThree.userData.physicsBody;
    var ms = objPhys.getMotionState();
    if (ms) {

      ms.getWorldTransform(transformAux1);
      var p = transformAux1.getOrigin();
      var q = transformAux1.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

    }
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
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  var vector = new THREE.Vector3(mouse.x, mouse.y, 1).unproject(camera);
  var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  var intersects = ray.intersectObjects(targetList, true);
  scene.remove(ball);
  console.log(targetList);
  if (intersects.length > 0) {
    hitted = true;
    console.log("hitting something");
  }

  // Creates a ball
  var ballMass = 3;
  var ballRadius = 0.4;

  var ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 18, 16), ballMaterial);
  ball.castShadow = true;
  ball.receiveShadow = true;
  var ballShape = new Ammo.btSphereShape(ballRadius);
  ballShape.setMargin(margin);
  pos.copy(ray.ray.direction);
  pos.add(ray.ray.origin);
  quat.set(0, 0, 0, 1);
  var ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);
  ballBody.setFriction(0.5);

  pos.copy(ray.ray.direction);
  pos.multiplyScalar(14);
  ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, 60));

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