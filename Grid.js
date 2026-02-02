class Grid {
  constructor(size) {
    this.size = size;
    // Keep a constant spacing in screen pixels so the number of visible
    // sample points stays the same regardless of zoom.
    this.screenSpacing = 30; // spacing in screen pixels between sample points
    this.samples = [];
  }
  
  getFieldStrength(particle) {
    let sum = createVector(0, 0);
    
    for (const p of particles) {
      if (p == particle) continue;
          
      let r = particle.pos.dist(p.pos);
      let safeR = max(0.0001, r);
      let magnitude = -p.q/(abs(safeR)**0.86)*2e2;

      sum.add(p5.Vector.sub(p.pos, particle.pos).setMag(magnitude));
    }

    return sum;
  }
  
  update(particles) {
    this.samples.length = 0;

    // Determine world bounds from global camera (camOffset, camScale) and canvas size
    let left = (-camOffset.x) / camScale;
    let top = (-camOffset.y) / camScale;
    let right = (width - camOffset.x) / camScale;
    let bottom = (height - uiHeight - camOffset.y) / camScale;

    // Convert desired screen spacing to world-space spacing so on-screen
    // spacing remains constant while zooming.
    let spacing = this.screenSpacing / camScale;

    // Start at a multiple of spacing so grid stays aligned
    let startX = Math.floor(left / spacing) * spacing;
    let startY = Math.floor(top / spacing) * spacing;

    // Cap the total samples to avoid performance blowup
    let maxSamples = 12000; // safety cap
    let count = 0;

    for (let y = startY; y <= bottom; y += spacing) {
      for (let x = startX; x <= right; x += spacing) {
        let pt = createVector(x, y);
        let sum = createVector(0, 0);

        for (const particle of particles) {
          let r = pt.dist(particle.pos);
          let safeR = max(0.0001, r);
          let magnitude = -particle.q / (abs(safeR) ** 0.86) * 2e2;
          sum.add(p5.Vector.sub(particle.pos, pt).setMag(magnitude/camScale));
        }

        this.samples.push({ x: x, y: y, vec: sum.limit(200) });

        if (++count > maxSamples) return; // stop early if too many
      }
    }
  }
  
  show() {
    for (const s of this.samples) {
      let x = s.x;
      let y = s.y;

      push();
      stroke(0, 0, 255);
      strokeWeight(4 / max(0.3, camScale));
      point(x, y);
      pop();

      let pt = s.vec;
      let m = constrain(round(mag(pt.x, pt.y)) * 7, 0, 255);

      drawArrow({ x, y }, pt, `rgb(${m}, ${0}, ${200})`);
    }
  }
}

function drawArrow(base, vec, myColor) {
  push();
  stroke(myColor);
  strokeWeight(2);
  fill(myColor);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 7;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 3, 0, -arrowSize / 3, arrowSize, 0);
  pop();
}