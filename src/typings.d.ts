
declare interface Navigator {
  serial: {
    getPorts(): Promise<SerialPort[]>
    requestPort(options?: {
      allowedBluetoothServiceClassIds?: string[]
      filters?: {
        bluetoothServiceClassId?: string
      }[]
    }): Promise<SerialPort>
  }
}

declare interface SerialPort {
  connected: boolean
  readable: ReadableStream | null
  writable: WritableStream | null

  open(options?: {
    baudRate?: number
    dataBits?: number
    stopBits?: number
    parity?: 'none' | 'even' | 'odd'
    flowControl?: 'none' | 'hardware'
  }): Promise<void>

  close(): Promise<void>
}
