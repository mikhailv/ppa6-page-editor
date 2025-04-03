import { sleep } from './util'

const serialPortServiceUUID = '00001101-0000-1000-8000-00805f9b34fb'
const baudRate = 115200

export interface PrinterInfo {
  name: string
  serialNumber: string
  firmware: string
}

export type ConcentrationLevel = 0 | 1 | 2

export class Printer {
  private _port?: SerialPort

  get connected(): boolean {
    return this._port?.connected ?? false
  }

  async printImage(img: ImageData, concentration: ConcentrationLevel = 2): Promise<void> {
    await this.connect()
    await this.setConcentration(concentration)
    await this.printRows(convertToMonochromeBinary(img))
    await this._port.close()
  }

  async getInfo(): Promise<PrinterInfo> {
    return {
      name: await this.getDeviceName(),
      serialNumber: await this.getDeviceSerialNumber(),
      firmware: await this.getDeviceFirmware(),
    }
  }

  private async connect() {
    const port = await this.requestPort()
    await this.open(port)
  }

  private async requestPort(): Promise<SerialPort> {
    let port = this._port
    if (port && port.connected) {
      return port
    }
    port = this._port = await navigator.serial.requestPort({ filters: [{ bluetoothServiceClassId: serialPortServiceUUID }] })
    return port
  }

  private async open(port: SerialPort) {
    try {
      await port.open({ baudRate })
    } catch (e) {
      if (!e.message.includes('is already open')) {
        throw e
      }
    }
    if (!port.readable || !port.writable || port.readable.locked || port.writable.locked) {
      // try to recover port state by reconnecting
      try {
        await port.close()
      } catch (e) {
        if (!e.message.includes('port is already closed')) {
          throw e
        }
      }
      await port.open({ baudRate })
    }

    await this.reset()
  }

  private async reset(): Promise<void> {
    await this.send(hexToBytes('10fffe01000000000000000000000000'))
  }

  private async getDeviceName(): Promise<string> {
    return bytesToText(await this.ask(hexToBytes('10ff3011')))
  }

  private async getDeviceSerialNumber(): Promise<string> {
    return bytesToText(await this.ask(hexToBytes('10ff20f2')))
  }

  private async getDeviceFirmware(): Promise<string> {
    return bytesToText(await this.ask(hexToBytes('10ff20f1')))
  }

  private async setConcentration(concentration: 0 | 1 | 2): Promise<void> {
    await this.send(hexToBytes(`10ff10000${concentration}`))
  }

  private async printRows(rows: Uint8Array[]): Promise<void> {
    await this.reset()
    await this.send(hexToBytes(`1d763000${toHex(rows[0].length, 2)}${toHex(rows.length, 2)}`))
    for (const row of rows) {
      await this.send(row)
      await sleep(10)
    }
  }

  private async ask(bytes: Uint8Array): Promise<Uint8Array> {
    await this.send(bytes)
    return this.receive()
  }

  private async send(bytes: Uint8Array) {
    const writer = this._port!.writable?.getWriter()
    if (writer) {
      try {
        await writer.write(bytes)
      } finally {
        writer.releaseLock()
      }
    } else {
      throw new Error('The serial port is not writable')
    }
  }

  private async receive(): Promise<Uint8Array> {
    const reader = this._port!.readable?.getReader()
    if (reader) {
      try {
        const { value } = await reader.read()
        if (value) {
          return value as Uint8Array
        }
        return new Uint8Array()
      } finally {
        reader.releaseLock()
      }
    } else {
      throw new Error('The serial port is not readable')
    }
  }
}

function hexToBytes(hex: string): Uint8Array {
  const b = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    b[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return b
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function convertToMonochromeBinary(img: ImageData): Uint8Array[] {
  if (img.width % 8 !== 0) {
    throw new Error("Image width must be a multiple of 8")
  }
  const rows: Uint8Array[] = Array(img.height)
  for (let i = 0; i < img.height; i++) {
    const row = new Uint8Array(img.width/8)
    row.fill(0)
    for (let j = 0; j < img.width; j++) {
      if (img.data[(j + i * img.width) * 4] === 0) {
        row[Math.floor(j / 8)] |= 1 << (7 - j % 8)
      }
    }
    rows[i] = row
  }
  return rows
}

function toHex(n: number, bytes: number): string {
  const r = new Array(bytes)
  for (let i = 0; i < bytes; i++) {
    r[i] = (0x100 | (n & 0xff)).toString(16).substring(1)
    n >>= 8
  }
  return r.join('')
}
