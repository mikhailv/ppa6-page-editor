const { min, max } = Math

export interface Pos {
  x: number
  y: number
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
    return { x: this.x, y: this.y }
  }

  get pos2(): Pos {
    return { x: this.x2, y: this.y2 }
  }

  get x2(): number {
    return this.x + this.width - 1
  }

  get y2(): number {
    return this.y + this.height - 1
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
}
