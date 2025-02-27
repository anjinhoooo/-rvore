let tree = [];
let attractors = [];
let maxDist = 1000;
let minDist = 1;

let blinked = false;
let faceDetected = false;
const EAR_THRESHOLD = 0.01;

let maxTreeSize = 8000; 
let treeStoppedGrowing = false; 
let flowers = []; 
let maxFlowers = 20000; 
let flowerGrowthThreshold = 0.1 * maxTreeSize; 

let manualBlink = false; 


const PINK_SHADES = [
  { r: 255, g: 183, b: 197 },
  { r: 245, g: 141, b: 161 }, 
  { r: 255, g: 218, b: 233 },
];

let gradientBias = 1;


let audio;
let audioStarted = false; 
let phraseDisplayed = true;


let eyeIconOpen;
let eyeIcon;


let downloadButton;

let interactionStarted = false; 

function preload() {

  audio = loadSound('Poema.mp3'); 
  

  eyeIconOpen = loadImage('eye_closed.png'); 
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(100);


  let root = new Branch(null, createVector(width / 2, height), 50);
  root.grow(createVector(width / 2, height - 10));
  tree.push(root);

  for (let i = 0; i < 500; i++) {
    let y = map(pow(random(), gradientBias), 0, 1, 0, height); 
    let x = random(width);
    attractors.push(createVector(x, y));
  }

  initializeFaceMesh();


  eyeIcon = eyeIconOpen;
  


  document.getElementById('start-button').addEventListener('click', startInteraction);
}

function startInteraction() {

  let startScreen = document.getElementById('start-screen');
  startScreen.classList.add('fade-out');


  setTimeout(() => {
    startScreen.style.display = 'none';
    interactionStarted = true; 
  }, 1000);
}

function keyPressed() {
  if (key === ' ' && interactionStarted) { 
    manualBlink = true;
    blinked = true;
  }
}

function keyReleased() {
  if (key === ' ' && interactionStarted) { 
    manualBlink = false;
  }
}

function initializeFaceMesh() {
  const videoElement = document.getElementById('video');
  const faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
  faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

  faceMesh.onResults(results => {
    if (results.multiFaceLandmarks.length > 0 && interactionStarted) { 
      faceDetected = true;

      if (!manualBlink) {
        const landmarks = results.multiFaceLandmarks[0];
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];

        const leftEAR = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightEAR = Math.abs(rightEyeTop.y - rightEyeBottom.y);

        const EAR = (leftEAR + rightEAR) / 2;

        blinked = EAR < EAR_THRESHOLD;

  
        if (!blinked && flowers.length > 0) {
          makeSomeFlowersFall();
        }
      }
    } else {
      faceDetected = false;
      if (!manualBlink) blinked = false;
    }
  });

  const camera = new Camera(videoElement, {
    onFrame: async () => { await faceMesh.send({ image: videoElement }); },
    width: 160, height: 120
  });
  camera.start();
}

function makeSomeFlowersFall() {

  let numFlowersToFall = Math.floor(flowers.length * 0.05);
  for (let i = 0; i < numFlowersToFall; i++) {
    let index = Math.floor(random(flowers.length));
    if (!flowers[index].falling) {
      flowers[index].falling = true;
      flowers[index].fallSpeed = random(0.5, 5); 
      flowers[index].rotation = random(TWO_PI); 
      flowers[index].rotationSpeed = random(-0.02, 0.02);
      flowers[index].opacity = 255; 
    }
  }
}


let audioEnded = false;

function draw() {
  background(255);


  if (phraseDisplayed && !audioStarted) {
    textSize(18);
    textAlign(CENTER, CENTER);
    fill(0);
    text("por favor fecha os olhos, vais ouvir um poema", width / 2, height / 2);
    

    imageMode(CENTER);
    image(eyeIcon, width / 2 - 220, height / 2, 50, 50);
  }


  if (blinked && !audioStarted) {
    phraseDisplayed = false; 
    audioStarted = true; 
    audio.play(); 
  }


  if (audioStarted && !audio.isPlaying() && !audioEnded) {
    audioEnded = true;
    treeStoppedGrowing = true; 
  }

  if (faceDetected && blinked && !treeStoppedGrowing && !audioEnded) {
    for (let i = 0; i < attractors.length; i++) {
      let a = attractors[i];
      let closestBranch = null;
      let closestDist = Infinity;

      for (let j = 0; j < tree.length; j++) {
        let b = tree[j];
        let d = p5.Vector.dist(a, b.pos);
        if (d < closestDist && d < maxDist) {
          closestDist = d;
          closestBranch = b;
        }
      }

      if (closestBranch) {
        let dir = p5.Vector.sub(a, closestBranch.pos).normalize();
        closestBranch.dir.add(dir);
        closestBranch.count++;

        if (closestDist < minDist) {
          attractors.splice(i, 1);
          i--;
        }
      }
    }

    for (let i = tree.length - 1; i >= 0; i--) {
      let b = tree[i];
      if (b.count > 0) {
        b.dir.div(b.count);


        b.dir.lerp(b.dir, 0.1); 


        let angle = random(-0.8, 0.8);
        b.dir.rotate(angle);


        if (random() < 0.5) { 
          continue;
        }

 
        let branchLength = random(5, 10); 
        let newPos = p5.Vector.add(b.pos, p5.Vector.mult(b.dir, branchLength));

        let newBranch = new Branch(b, newPos);
        tree.push(newBranch);
        b.reset();
      }
    }


    if (tree.length >= maxTreeSize) {
      treeStoppedGrowing = true;
    }
  }

  for (let b of tree) {
    b.show();
  }


  if (tree.length >= flowerGrowthThreshold && flowers.length < maxFlowers && blinked && !audioEnded) {

    let targetFlowers = map(tree.length, flowerGrowthThreshold, maxTreeSize, 0, maxFlowers);
    targetFlowers = constrain(targetFlowers, 0, maxFlowers);

    if (flowers.length < targetFlowers) {
      let branchesWithFlowers = tree.filter(b => b.distanceFromOrigin() > 300 && b.children.length === 0);
      if (branchesWithFlowers.length > 0) {
        for (let i = 0; i < 10; i++) {
          let b = random(branchesWithFlowers);
          let offsetX = random(-10, 10); 
          let offsetY = random(-10, 10);
          let colorShade = random(PINK_SHADES); 
          flowers.push({
            x: b.pos.x + offsetX,
            y: b.pos.y + offsetY,
            falling: false,
            fallSpeed: 0,
            rotation: 0,
            rotationSpeed: 0,
            opacity: 255,
            color: colorShade,
          });
        }
      }
    }
  }

  for (let flower of flowers) {
    if (flower.falling && !audioEnded) { 
      flower.y += flower.fallSpeed;
      flower.fallSpeed *= 1.02;
      flower.rotation += flower.rotationSpeed; 
      flower.opacity -= 10; 

      if (flower.y > height + 20 || flower.opacity <= 0) {
        flowers.splice(flowers.indexOf(flower), 1);
      }
    }
    drawCherryBlossom(flower.x, flower.y, flower.rotation, flower.opacity, flower.color);
  }
}

function drawCherryBlossom(x, y, rotation, opacity, colorShade) {
  push();
  translate(x, y);
  rotate(rotation);
  noStroke();
  fill(colorShade.r, colorShade.g, colorShade.b, opacity);

  for (let i = 0; i < 5; i++) {
    let angle = TWO_PI / 5 * i;
    let petalSizeX = random(5, 8);
    let petalSizeY = random(8, 12);
    let petalX = cos(angle) * 10;
    let petalY = sin(angle) * 10;
    ellipse(petalX, petalY, petalSizeX, petalSizeY);
  }

  fill(colorShade.r, colorShade.g, colorShade.b, opacity);
  ellipse(0, 0, 5, 5);
  pop();
}

class Branch {
  constructor(parent, pos, initialThickness) {
    this.parent = parent;
    this.pos = pos;
    this.dir = createVector(0, 0);
    this.count = 0;
    this.initialThickness = initialThickness || 15; 
    this.thickness = this.initialThickness;

    this.length = random(5, 15); 
    this.growthSpeed = random(0.5, 3); 
    this.children = []; 
  }

  reset() {
    this.dir = createVector(0, 0);
    this.count = 0;
  }

  grow(dir) {
    this.dir = dir;
  }

  show() {
    if (this.parent) {
      let distanceFromRoot = this.distanceFromOrigin();


      this.thickness = map(distanceFromRoot, 0, height, this.initialThickness, 1);
      this.thickness = constrain(this.thickness, 1, this.initialThickness);

      stroke(0);
      strokeWeight(this.thickness);

      let dir = p5.Vector.sub(this.pos, this.parent.pos).normalize();
      let endPos = p5.Vector.add(this.parent.pos, p5.Vector.mult(dir, this.length));

      line(this.parent.pos.x, this.parent.pos.y, endPos.x, endPos.y);
    }
  }

  distanceFromOrigin() {
    let current = this;
    let distance = 0;
    while (current.parent) {
      distance += p5.Vector.dist(current.pos, current.parent.pos);
      current = current.parent;
    }
    return distance;
  }
}

