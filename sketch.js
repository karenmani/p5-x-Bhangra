let video;
let videoReady = false;
let poseNet;
let poses = [];
let skeletons = [];
let nose, rightWrist, leftWrist, rightKnee, leftKnee;
let nScore, rwScore, lwScore, rkScore, lkScore;
let song, song2;
let delay, rev;
let delayTime, lastDelay;
let allButton = document.getElementById('all-button');
let algozeButton = document.getElementById('algoze-button');
let dholButton = document.getElementById('dhol-button');
let helpButton = document.getElementById('help-button');
let closeButton = document.getElementById('modal-close-button');
let modal = document.getElementById('modal');

function preload() {
  song = loadSound('dhol_main_loop.mp3');
  song2 = loadSound('algoze_silence.mp3');
}

function modelLoaded() {
  console.log("Model Loaded");
  videoReady = true;
}

//setup code
function setup() {
  // const w = windowWidth;
  // const h = windowHeight - 125;
  // const h = (w * 9) / 16;
  const w = 640;
  const h = 480;

  cnv = createCanvas(w, h);
  background(65);

  cnv.parent('camera');

  video = createCapture({
    video: {
      width: w,
      height: h,
    },
    audio: false,
  });

  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on('pose', getPoses);
  video.hide();

  delay = new p5.Delay();
  song2.connect();
  delay.process(song2, 0.12, 0.5, 2300);
  delay.setType('pingPong');
  delay.delayTime(0.0);
  delay.amp(0.0);

  rev = new p5.Reverb();
  song.connect();
  rev.process(song, 3, 2);

  helpButton.addEventListener('click', helpPressed);
  closeButton.addEventListener('click', closeHelpPressed);
  allButton.addEventListener('click', allPressed);
  algozeButton.addEventListener('click', algozePressed);
  dholButton.addEventListener('click', dholPressed);
}

function draw() {
  if (!videoReady) {
    textSize(32);
    fill('#222');
    textAlign(CENTER, CENTER);
    text('loading...', 320, 240);
    return;
  }

  //mirrors image 
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  //draws dots on nose, wrists, and knees
  drawPoints();

  //delays algoze with LW y-position
  //reverbs dhol with RW x-position
  if (rightWrist) {
    delayAudio();
  } else {
    return;
  }

  if(leftWrist) {
    reverbAudio();
  } else {
    return;
  }

  //pans dhol with nose x-position 
  panning();
}

//identifies body parts using posenet
function getPoses(poses) {
  if(poses.length > 0) {
    let pose = poses[0].pose;

    nose = pose.keypoints[0].position;
    nScore = pose.keypoints[0].score;

    leftWrist = pose.keypoints[9].position;
    lwScore = pose.keypoints[9].score;
    
    rightWrist = pose.keypoints[10].position;
    rwScore = pose.keypoints[10].score;
  }
}

//draws points on nose, wrists, knees 
function drawPoints() {
  if(nose && nScore > 0.6) {
    stroke(255, 0, 0);
    strokeWeight(15);
    point(nose.x, nose.y);
  }

  if(rightWrist && rwScore > 0.25) {
    stroke(255, 0, 0);
    strokeWeight(15);
    point(rightWrist.x, rightWrist.y); 
  }

  if(leftWrist && lwScore > 0.25) {
    stroke(255, 0, 0);
    strokeWeight(15);
    point(leftWrist.x, leftWrist.y);
  }
}

function toggleAlgoze() {
  if (!song2.isLooping()) {
    song2.loop();
    algozeButton.innerText = "Stop Algoze";
  } else {
    song2.stop();
    algozeButton.innerText = "Start Algoze";
  }
}

function toggleDhol() {
  if (!song.isLooping()) {
    song.loop();
    dholButton.innerText = "Stop Dhol";
  } else {
    song.stop();
    dholButton.innerText = "Start Dhol";
  }
}

function toggleAll() {
  toggleAlgoze();
  toggleDhol();

  if (allButton.innerText.startsWith('Start')) {
    allButton.innerText = 'Stop all';
  } else {
    allButton.innerText = 'Start all';
  }
}

function allPressed() {
  toggleAll();
}

function algozePressed() {
  toggleAlgoze();
}

function dholPressed(){
  toggleDhol();
}

function openHelp() {
  modal.classList.add('active');
}

function closeHelp() {
  modal.classList.remove('active');
}

function helpPressed() {
  openHelp();
}

function closeHelpPressed() {
  closeHelp();
}


//starts sound files using keyboard keys
function keyPressed() {
  if(keyCode === RIGHT_ARROW) {
    toggleAlgoze();
  } else if(keyCode === LEFT_ARROW) {
    toggleDhol();
  // Question Mark
  } else if (keyCode === 191) {
    openHelp();
  // Escape Key
  } else if (keyCode === 27) {
    closeHelp();
  // Space Bar
  } else if(keyCode === 32) {
    toggleAll();
  }
}

//uses nose to pan dhol 
function panning() {
  if(song.isLooping() && nose) {
    let panning = map(nose.x, 0, width, 1.0, -1.0); //pan right on 1 and left on -1
    song.pan(panning);
  } 
  if(song2.isPlaying() && nose) {
    let panning2 = map(nose.x, 0, width, 1.0, -1.0);
    song2.pan(panning2);
  }
}

//uses right wrist's vertical pos to delay algoze with left arrow click
function delayAudio() {
  const timeElapsedSinceLastDelay = performance.now() - lastDelay;
  if (timeElapsedSinceLastDelay < (delayTime * 1000)) {
    console.log('Skipping delay, not finished yet...');
    return;
  }
  if(rightWrist && rwScore > 0.25) {
      delayTime = map(rightWrist.y, 0, width, 4.0, 0.5);
      delay.delayTime(delayTime);
      lastDelay = performance.now();
      console.log("Delay Time: " + delayTime);
      delay.amp(1.0);
  }
  else {
    delay.delayTime(0.0);
    return;
  }
}

//uses left wrist's horizontal pos to alter dry/wet of dhol
function reverbAudio() {
  if(leftWrist && lwScore > 0.25 && song.isLooping()) {
    let dryWet = constrain(map(leftWrist.x, width, 0, 0, 1), 0, 1); 
    rev.drywet(dryWet);
  } else {
    rev.drywet(0);
    return;
  }
}