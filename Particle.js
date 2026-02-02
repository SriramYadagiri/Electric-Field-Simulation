class Particle {
  constructor(q, x, y) {
    this.q = q;
    this.mass = this.q > 0 ? 1836 : 1;
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0)
  }
  
  applyForce(Efield) {
    let force = Efield.mult(this.q);
    this.acc.add(force.mult(1/this.mass/100));
  }
  
  update() {
    //this.acc.mult(SLOW);
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    //this.vel.mult(SLOW)
    this.acc.mult(0)
  }
  
  show() {
    push()
    noFill()
    stroke(255)
    circle(this.pos.x, this.pos.y, 45);
    strokeWeight(1)
    textAlign(CENTER)
    textSize(16);
    fill(255)
    text(this.q, this.pos.x, this.pos.y+2.5)
    pop()
  }
}