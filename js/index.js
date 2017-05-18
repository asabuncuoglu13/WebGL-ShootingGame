/*!
 * WebGL Tunnel - Luigi Mannoni
 * luigimannoni.com / codepen.io/luigimannoni
 * CC BY-NC 4.0 http://creativecommons.org/licenses/by-nc/4.0/ 
 */

var video = document.getElementById('video');
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var scene, camera, innerColor, renderer, time = null;
var starField, tunnelMesh, tunnelTexture = null;
var projector, mouse = { x: 0, y: 0 }, INTERSECTED;
var selectedFaces = [];
var mouseSphere = [];
var targetList = [];
/*var tracker = new tracking.ColorTracker('cyan');
tracker.on('track', function (event) {
  if (event.data.length === 0) {
    // No colors were detected in this frame.
  } else {
    event.data.forEach(function (rect) {
      target.x = rect.x;
      target.y = rect.y;
      console.log(rect.x, rect.y, rect.height, rect.width, rect.color);
    });
  }
});
tracking.track('#video', tracker, { camera: true });*/

init();
animate();

// Obligatory helper function
function deg2rad(_degrees) {
  return (_degrees * Math.PI / 180);
}

function init() { 
  time = new THREE.Clock();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  innerColor = 0x2222ff;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x000000, 0); // background

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = -110;
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
  var monster = null;
  var bird = null;
  loader.load("monster/bird.json", 
    function (obj) {
      bird = obj;
      bird.position.z = 100;
      scene.add(bird);
    }
  );

  loader.load("monster/monster.json",
    function (obj) {
      monster = obj;
      monster.position.z = 5;
      scene.add(monster);
    }
  );

  var newSphereGeom = new THREE.SphereGeometry(5, 5, 5);
  var sphere = new THREE.Mesh(newSphereGeom, new THREE.MeshBasicMaterial({ color: 0x2266dd }));
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
  checkHighlight();
  CheckMouseSphere();
  ColorSelected();
}


function checkSelection() {
  // find intersections

  // create a Ray with origin at the mouse position
  //   and direction into the scene (camera direction)
  var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
  projector.unprojectVector(vector, camera);
  var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  // create an array containing all objects in the scene with which the ray intersects
  var intersects = ray.intersectObjects(targetList);

  //if an intersection is detected
  if (intersects.length > 0) {
    console.log("Hit @ " + toString(intersects[0].point));

    //test items in selected faces array
    var test = -1;
    selectedFaces.forEach(function (arrayItem) {
      // if the faceIndex and object ID are the same between the intersect and selected faces ,
      // the face index is recorded
      if (intersects[0].faceIndex == arrayItem.faceIndex && intersects[0].object.id == arrayItem.object.id) {
        test = selectedFaces.indexOf(arrayItem);
      }
    });

    // if is a previously selected face, change the color back to green, otherswise change to blue
    if (test >= 0) {
      intersects[0].face.color = new THREE.Color(0x44dd66);
      selectedFaces.splice(test, 1);
    }
    else {
      intersects[0].face.color = new THREE.Color(0x222288);
      selectedFaces.push(intersects[0]);
    }

    intersects[0].object.geometry.colorsNeedUpdate = true;
  }
}

function ColorSelected(){
	selectedFaces.forEach( function(arrayItem)
		{
			arrayItem.face.color = selectedColor;
			arrayItem.object.geometry.colorsNeedUpdate = true;
		});
}

function checkSelection(){
	// find intersections

	// create a Ray with origin at the mouse position
	//   and direction into the scene (camera direction)
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	projector.unprojectVector( vector, camera );
	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

	// create an array containing all objects in the scene with which the ray intersects
	var intersects = ray.intersectObjects( targetList );

	//if an intersection is detected
	if ( intersects.length > 0 )
	{
		console.log("Hit @ " + toString( intersects[0].point ) );
		
		//test items in selected faces array
		var test=-1; 
		selectedFaces.forEach( function(arrayItem)
		{
			// if the faceIndex and object ID are the same between the intersect and selected faces ,
			// the face index is recorded
			if(intersects[0].faceIndex==arrayItem.faceIndex && intersects[0].object.id==arrayItem.object.id){
				test=selectedFaces.indexOf(arrayItem);
			}
		});
		
		// if is a previously selected face, change the color back to green, otherswise change to blue
		if(test>=0){
			intersects[ 0 ].face.color=new THREE.Color( 0x44dd66 ); 
			selectedFaces.splice(test, 1);
		}
		else{
			intersects[ 0 ].face.color=new THREE.Color( 0x222288 ); 
			selectedFaces.push(intersects[0]);
		}
		
		intersects[ 0 ].object.geometry.colorsNeedUpdate = true;
	}
}
function checkHighlight(){
	// find intersections

	// create a Ray with origin at the mouse position
	//   and direction into the scene (camera direction)
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	projector.unprojectVector( vector, camera );
	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

	// create an array containing all objects in the scene with which the ray intersects
	var intersects = ray.intersectObjects( targetList );

	// INTERSECTED = the object in the scene currently closest to the camera 
	//		and intersected by the Ray projected from the mouse position 	
	
	// if there is one (or more) intersections
	if ( intersects.length > 0 )
	{	// case if mouse is not currently over an object
		if(INTERSECTED==null){
			INTERSECTED = intersects[ 0 ];
			INTERSECTED.face.color = highlightedColor;
		}
		else{	// if thse mouse is over an object
			INTERSECTED.face.color= baseColor;
			INTERSECTED.object.geometry.colorsNeedUpdate=true;
			INTERSECTED = intersects[ 0 ];
			INTERSECTED.face.color = highlightedColor;			
		}
		// upsdate mouseSphere coordinates and update colors
		mouseSphereCoords = [INTERSECTED.point.x,INTERSECTED.point.y,INTERSECTED.point.z];
		INTERSECTED.object.geometry.colorsNeedUpdate=true;
		
	} 
	else // there are no intersections
	{
		// restore previous intersection object (if it exists) to its original color
		if ( INTERSECTED ){
			INTERSECTED.face.color = baseColor;
			INTERSECTED.object.geometry.colorsNeedUpdate=true;
		}
		// remove previous intersection object reference
		//     by setting current intersection object to "nothing"
		
		INTERSECTED = null;
		mouseSphereCoords = null;
		
		
	}
}

function CheckMouseSphere(){
	// if the coordinates exist, make the sphere visible
	if(mouseSphereCoords != null){
		//console.log(mouseSphereCoords[0].toString()+","+mouseSphereCoords[1].toString()+","+mouseSphereCoords[2].toString());
		mouseSphere[0].position.set(mouseSphereCoords[0],mouseSphereCoords[1],mouseSphereCoords[2]);
		mouseSphere[0].visible = true;
	}
	else{ // otherwise hide the sphere
		mouseSphere[0].visible = false;
	}
}

function render() {
  camera.position.x = mouse.x * 0.05;
  camera.position.y = -mouse.y * 0.05;
  /*if (monster) {
    monster.position.z -= 1;
    monster.position.y = Math.random();
  }
  if (bird) {
    bird.position.z -= 1;
    bird.position.y = Math.random();
  }*/
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
document.addEventListener( 'mousemove', onDocumentMouseMove, false );
document.addEventListener( 'mousedown', onDocumentMouseDown, false );

function onDocumentMouseDown( event ) 
{
	//console.log("Click.");
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	checkSelection();	
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove( event ) {
  mouse.x = event.clientX - window.innerWidth/2;
  mouse.y = event.clientY - window.innerHeight/2;
}