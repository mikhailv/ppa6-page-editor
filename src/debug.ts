import { Rect } from './rect'

export class Debug {
  readonly enabled: boolean
  readonly rects: Rect[] = []
  private readonly _metrics: Record<string, number> = {}

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  get metrics(): string[] {
    return Object.entries(this._metrics).map(([name, time]) => `${name}: ${time} ms.`)
  }

  trackTime(name: string, fn: () => void): void {
    const st = Date.now()
    fn()
    this._metrics[name] = (this._metrics[name] ?? 0) + Date.now() - st
  }
}

