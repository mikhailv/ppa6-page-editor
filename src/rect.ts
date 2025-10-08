const { min, max } = Math

export class Pos {
  constructor(
    public x: number,
    public y: number,
  ) {
  }

  set(x: number, y: number) {
    this.x = x
    this.y = y
  }

  copy(): Pos {
    return new Pos(this.x, this.y)
  }
}

export class Rect {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
  ) {
  }

  get pos(): Pos {
    return new Pos(this.x, this.y)
  }

  get pos2(): Pos {
    return new Pos(this.x2, this.y2)
  }

  get x2(): number {
    return this.x + this.width - 1
  }

  get y2(): number {
    return this.y + this.height - 1
  }

  set(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  squire(): boolean {
    return this.width === this.height
  }

  rotate() {
    const t = this.width
    // noinspection JSSuspiciousNameCombination
    this.width = this.height
    this.height = t
  }

  inside(p: Pos): boolean {
    return p.x >= this.x && p.x <= this.x2 && p.y >= this.y && p.y <= this.y2
  }

  outside(p: Pos): boolean {
    return !this.inside(p)
  }

  toString(): string {
    return `${this.x},${this.y}-${this.width}x${this.height}`
  }

  overlaps(other: Rect): boolean {
    return max(this.x, other.x) < min(this.x2, other.x2)
      && max(this.y, other.y) < min(this.y2, other.y2)
  }

  copy(): Rect {
    return new Rect(this.x, this.y, this.width, this.height)
  }
}
