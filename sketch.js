let size; 
let K = 2e4;
let grid;
let particles = [];
// Camera (pan & zoom)
let camScale = 1;
let camOffset;
let panningActive = false;
let selectedCharge = 5; // Default charge for new particles
let isPlaying = false;
let selectedParticle = null;
let draggingParticle = null;
let uiHeight = 60;
let chargeDialog = null;
let chargeInput = null;

let buttonPressed = false;

// UI Button class
class Button {
  constructor(x, y, w, h, label, action) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.action = action;
    this.hovered = false;
  }
  
  show() {
    // Check hover
    this.hovered = mouseX > this.x && mouseX < this.x + this.w &&
                   mouseY > this.y && mouseY < this.y + this.h;
    
    // Draw button
    fill(this.hovered ? 60 : 40);
    stroke(200);
    strokeWeight(2);
    rect(this.x, this.y, this.w, this.h, 5);
    
    // Draw label
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text(this.label, this.x + this.w/2, this.y + this.h/2);
  }
  
  clicked() {
    if (this.hovered) {
      this.action();
      return true;
    }
    return false;
  }
}

// UI Buttons
let playPauseBtn, resetBtn, homeBtn, positiveBtn, negativeBtn;

function setup() { 
  createCanvas(window.innerWidth, window.innerHeight-1); 
  size = 30; 
  
  // Initialize with some particles
  particles.push(new Particle(5, 500, 300));
  particles.push(new Particle(-5, 400, 200));
  particles.push(new Particle(-5, 600, 200));
  particles.push(new Particle(5, 500, 100));
  
  grid = new Grid(size);
  
  // Create UI buttons
  playPauseBtn = new Button(10, height-uiHeight+10, 100, 40, "Play", togglePlayPause);
  resetBtn = new Button(120, height-uiHeight+10, 100, 40, "Reset", resetSimulation);
  homeBtn = new Button(230, height-uiHeight+10, 100, 40, "Home", home);
  
  positiveBtn = new Button(350, height-uiHeight+10, 120, 40, "Positive (+)", () => selectedCharge = 5);
  negativeBtn = new Button(480, height-uiHeight+10, 120, 40, "Negative (-)", () => selectedCharge = -5);
  camOffset = createVector(0, 0);
}

function draw() { 
  background(0);
  
  // Draw field area
  fill(10);
  noStroke();
  rect(0, 0, width, height - uiHeight);
  // Convert mouse position to world coordinates for interactions/preview
  let worldMouse = screenToWorld(mouseX, mouseY);

  // Update and draw field contents inside camera transform
  push();
  translate(camOffset.x, camOffset.y);
  scale(camScale);

  grid.update(particles);
  grid.show();

  // Show all particles (physics runs in world coords)
  for (let p of particles) {
    if (isPlaying) {
      let Efield = grid.getFieldStrength(p);
      p.applyForce(Efield);
      p.update();
    }
    p.show();
  }

  // Highlight selected particle
  if (selectedParticle) {
    noFill();
    stroke(255, 255, 0);
    strokeWeight(3);
    circle(selectedParticle.pos.x, selectedParticle.pos.y, 50);
  }

  // Preview particle at mouse when in field area (in world coords)
  if (mouseY < height - uiHeight && !draggingParticle && !panningActive) {
    noStroke();
    fill(selectedCharge > 0 ? color(255, 0, 0, 100) : color(0, 0, 255, 100));
    circle(worldMouse.x, worldMouse.y, 30);
  }

  pop();
  
  // Draw UI panel
  fill(30);
  noStroke();
  rect(0, height-uiHeight, width, uiHeight);
  
  // Draw buttons
  playPauseBtn.label = isPlaying ? "Pause" : "Play";
  playPauseBtn.show();
  resetBtn.show();
  homeBtn.show();
  positiveBtn.show();
  negativeBtn.show();
  
  // Highlight selected charge button
  if (selectedCharge > 0) {
    noFill();
    stroke(0, 255, 0);
    strokeWeight(3);
    rect(positiveBtn.x, positiveBtn.y, positiveBtn.w, positiveBtn.h, 5);
  } else {
    noFill();
    stroke(255, 0, 0);
    strokeWeight(3);
    rect(negativeBtn.x, negativeBtn.y, negativeBtn.w, negativeBtn.h, 5);
  }
  
  // Draw instructions
  fill(200);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Click in field to add particle | Click particle to select and edit | Drag to move ", 650, height-uiHeight/2);
  
  // Draw charge dialog if active
  if (chargeDialog) {
    drawChargeDialog();
  }
  
}

function mousePressed() {
  if (chargeDialog) {
    handleChargeDialogClick();
    return;
  }
  panningActive = false;

  // Check UI buttons first
  if (mouseY > height - uiHeight) {
    playPauseBtn.clicked();
    resetBtn.clicked();
    homeBtn.clicked();
    positiveBtn.clicked();
    negativeBtn.clicked();
    return;
  }
  // Convert to world coordinates for particle hit tests
  let worldMouse = screenToWorld(mouseX, mouseY);

  // Check if clicking on existing particle
  for (let p of particles) {
    let d = dist(worldMouse.x, worldMouse.y, p.pos.x, p.pos.y);
    if (d < 25) {
      selectedParticle = p;
      draggingParticle = p;
      return;
    }
  }

  // If not clicking on a particle, deselect (possible add on release)
  selectedParticle = null;
}

function mouseReleased() {
  // If charge dialog is open, don't do anything
  if (chargeDialog) {
    return;
  }

  if (buttonPressed) {
    buttonPressed = false;
    return;
  }
  
  // If we were dragging a particle, stop and maybe open dialog
  if (draggingParticle) {
    let d = dist(mouseX, mouseY, pmouseX, pmouseY);
    // If mouse barely moved, it was a click - open charge dialog
    if (d < 5) {
      openChargeDialog(draggingParticle);
    }
    draggingParticle = null;
    return;
  }

  // If clicking in field area and not on a particle, add new particle (only if we didn't pan)
  if (mouseY < height - uiHeight && !panningActive) {
    let worldMouse = screenToWorld(mouseX, mouseY);
    let clickedOnParticle = false;
    for (let p of particles) {
      let d = dist(worldMouse.x, worldMouse.y, p.pos.x, p.pos.y);
      if (d < 25) {
        clickedOnParticle = true;
        break;
      }
    }

    if (!clickedOnParticle) {
      particles.push(new Particle(selectedCharge, worldMouse.x, worldMouse.y));
    }
  }
}

function mouseDragged() {
  // If dragging a particle, move it in world coords
  if (draggingParticle && mouseY < height - uiHeight) {
    let worldMouse = screenToWorld(mouseX, mouseY);
    draggingParticle.pos.x = worldMouse.x;
    draggingParticle.pos.y = worldMouse.y;
    return;
  }

  // Otherwise pan the view when dragging on empty field area
  if (!draggingParticle && mouseY < height - uiHeight) {
    camOffset.x += mouseX - pmouseX;
    camOffset.y += mouseY - pmouseY;
    panningActive = true;
  }
}

// Convert screen coordinates to world coordinates (taking camera into account)
function screenToWorld(x, y) {
  return createVector((x - camOffset.x) / camScale, (y - camOffset.y) / camScale);
}

function worldToScreen(v) {
  return createVector(v.x * camScale + camOffset.x, v.y * camScale + camOffset.y);
}

function mouseWheel(event) {
  // Zoom in/out centered on mouse position
  const factor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
  let mouseScreen = createVector(mouseX, mouseY);
  let worldBefore = p5.Vector.sub(mouseScreen, camOffset).div(camScale);
  camScale *= factor;
  camScale = constrain(camScale, 0.2, 1.1);
  camOffset = p5.Vector.sub(mouseScreen, p5.Vector.mult(worldBefore, camScale));
  return false; // prevent default
}

function keyPressed() {  
  // Flip charge of selected particle
  if (key === 'f' || key === 'F') {
    if (selectedParticle) {
      selectedParticle.q *= -1;
    }
  }
}

function togglePlayPause() {
  isPlaying = !isPlaying;
  // Note: Currently particles are static. If you want them to move,
  // you can add physics in the Particle class and update positions when isPlaying is true
}

function home() {
  camOffset = createVector(0, 0);
  camScale = 1;
}

function resetSimulation() {
  particles = [];
  selectedParticle = null;
  draggingParticle = null;
  isPlaying = false;
  camOffset = createVector(0, 0);
  camScale = 1;
  closeChargeDialog();
}

// Charge dialog functions
function openChargeDialog(particle) {
  chargeDialog = {
    particle: particle,
    x: width / 2 - 150,
    y: 200,
    w: 420,
    h: 150
  };
  
  // Create input element
  chargeInput = createInput(str(particle.q));
  chargeInput.position(chargeDialog.x + 70, chargeDialog.y + 50);
  chargeInput.size(260);
  chargeInput.style('font-size', '18px');
  chargeInput.style('padding', '10px');
  chargeInput.elt.focus();
  chargeInput.elt.select();
}

function closeChargeDialog() {
  if (chargeInput) {
    chargeInput.remove();
    chargeInput = null;
  }
  chargeDialog = null;
}

function drawChargeDialog() {
  // Semi-transparent overlay
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Dialog box
  fill(40);
  stroke(200);
  strokeWeight(2);
  rect(chargeDialog.x, chargeDialog.y, chargeDialog.w, chargeDialog.h, 10);
  
  // Title
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  text("Edit Particle Charge", chargeDialog.x + chargeDialog.w / 2, chargeDialog.y + 25);
  
  // Buttons
  let btnW = 120;
  let btnH = 35;
  let btnY = chargeDialog.y + 105;
  
  // OK button
  let okX = chargeDialog.x + 20;
  fill(mouseX > okX && mouseX < okX + btnW && 
       mouseY > btnY && mouseY < btnY + btnH ? 60 : 40);
  stroke(0, 200, 0);
  strokeWeight(2);
  rect(okX, btnY, btnW, btnH, 5);
  fill(255);
  noStroke();
  textSize(16);
  text("OK", okX + btnW / 2, btnY + btnH / 2);
  
  // Cancel button
  let cancelX = chargeDialog.x + 150;
  fill(mouseX > cancelX && mouseX < cancelX + btnW && 
       mouseY > btnY && mouseY < btnY + btnH ? 60 : 40);
  stroke(200, 0, 0);
  strokeWeight(2);
  rect(cancelX, btnY, btnW, btnH, 5);
  fill(255);
  noStroke();
  text("Cancel", cancelX + btnW / 2, btnY + btnH / 2);
  
  let deleteX = chargeDialog.x + 280;
  fill(mouseX > deleteX && mouseX < deleteX + btnW && 
       mouseY > btnY && mouseY < btnY + btnH ? 60 : 40);
  stroke(200, 0, 0);
  strokeWeight(2);
  rect(deleteX, btnY, btnW, btnH, 5);
  fill(255);
  noStroke();
  text("Delete", deleteX + btnW / 2, btnY + btnH / 2);
}

function handleChargeDialogClick() {
  if (!chargeDialog) return;
  
  let btnW = 120;
  let btnH = 35;
  let btnY = chargeDialog.y + 105;
  let okX = chargeDialog.x + 30;
  let cancelX = chargeDialog.x + 150;
  let deleteX = chargeDialog.x + 270;
  
  // Check OK button
  if (mouseX > okX && mouseX < okX + btnW && 
      mouseY > btnY && mouseY < btnY + btnH) {
    applyChargeChange();
  }
  // Check Cancel button
  else if (mouseX > cancelX && mouseX < cancelX + btnW && 
           mouseY > btnY && mouseY < btnY + btnH) {
    closeChargeDialog();
  }
  
  else if (mouseX > deleteX && mouseX < deleteX + btnW && 
           mouseY > btnY && mouseY < btnY + btnH) {
    deleteCharge();
  }

  buttonPressed = true;
}

function applyChargeChange() {
  if (chargeDialog && chargeInput) {
    let newCharge = parseFloat(chargeInput.value());
    if (!isNaN(newCharge) && newCharge !== 0) {
      chargeDialog.particle.q = newCharge;
    }
  }
  closeChargeDialog();
}

function deleteCharge() {
  // Delete selected particle
  if (chargeDialog.particle.q) {
    let index = particles.indexOf(chargeDialog.particle);
    if (index > -1) {
      particles.splice(index, 1);
      selectedParticle = null;
      closeChargeDialog();
    }
  }
}