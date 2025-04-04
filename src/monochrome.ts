
export interface ThresholdScale {
  min: number
  max: number
  step: number
  default: number
}

export interface MonochromeThreshold {
  name: string
  threshold?: ThresholdScale
  blockSizes?: number[]
  apply: (ctx: CanvasRenderingContext2D, threshold?: number, blockSize?: number) => void
}

const defaultBlockSizes = [3, 5, 7, 9, 11, 13, 15]

export const monochromeThresholds: MonochromeThreshold[] = [
  {
    name: 'Simple',
    threshold: { min: 0, max: 255, step: 1, default: 180 },
    apply: simpleMonochrome,
  },
  {
    name: 'Adaptive',
    threshold: { min: 1, max: 80, step: 1, default: 1 },
    blockSizes: defaultBlockSizes,
    apply: adaptiveThreshold,
  },
  {
    name: 'Adaptive StdDev',
    threshold: { min: 0, max: 1, step: 0.05, default: 0 },
    blockSizes: defaultBlockSizes,
    apply: adaptiveThresholdStdDev,
  },
  {
    name: 'Adaptive Otsu Local',
    blockSizes: defaultBlockSizes,
    apply: adaptiveThresholdOtsuLocal,
  },
  {
    name: 'Adaptive Otsu Global',
    apply: adaptiveThresholdOtsuGlobal,
  },
]

function toGrayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export function simpleMonochrome(ctx: CanvasRenderingContext2D, threshold: number) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const grayscale = toGrayscale(data[i], data[i+1], data[i+2])
    const monochrome = grayscale >= threshold ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = monochrome
  }
  ctx.putImageData(imageData, 0, 0)
}

function adaptiveThreshold(ctx: CanvasRenderingContext2D, C: number = 1, blockSize: number = 5): void {
  const { width, height } = ctx.canvas

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Convert the image to grayscale
  const grayscaleData = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    grayscaleData[i / 4] = toGrayscale(data[i], data[i+1], data[i+2])
  }

  // Compute the integral image
  const integralImage = new Uint32Array((width + 1) * (height + 1))
  for (let y = 1; y <= height; y++) {
    let rowSum = 0
    for (let x = 1; x <= width; x++) {
      const idx = (y - 1) * width + (x - 1)
      rowSum += grayscaleData[idx]
      integralImage[y * (width + 1) + x] =
        integralImage[(y - 1) * (width + 1) + x] + rowSum
    }
  }

  // Apply adaptive thresholding using the integral image
  const halfBlock = Math.floor(blockSize / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Define the region boundaries
      const x1 = Math.max(x - halfBlock, 0)
      const y1 = Math.max(y - halfBlock, 0)
      const x2 = Math.min(x + halfBlock, width - 1)
      const y2 = Math.min(y + halfBlock, height - 1)

      // Calculate the sum of the region using the integral image
      const area = (x2 - x1 + 1) * (y2 - y1 + 1)
      const sum =
        integralImage[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integralImage[(y2 + 1) * (width + 1) + x1] -
        integralImage[y1 * (width + 1) + (x2 + 1)] +
        integralImage[y1 * (width + 1) + x1]

      // Calculate the mean intensity
      const mean = sum / area

      // Apply the threshold
      const idx = (y * width + x) * 4
      const value = grayscaleData[y * width + x] > mean - C ? 255 : 0
      data[idx] = value // Red
      data[idx + 1] = value // Green
      data[idx + 2] = value // Blue
    }
  }

  // Put the modified image data back to the canvas
  ctx.putImageData(imageData, 0, 0)
}

function adaptiveThresholdStdDev(ctx: CanvasRenderingContext2D, k: number = 0.3, blockSize: number = 5): void {
  const { width, height } = ctx.canvas

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Create a copy of the original grayscale data for calculations
  const grayscaleData = new Uint8Array(width * height)

  // Convert the image to grayscale and store in grayscaleData
  for (let i = 0; i < data.length; i += 4) {
    grayscaleData[i / 4] = toGrayscale(data[i], data[i+1], data[i+2])
  }

  const integralWidth = width + 1
  // Compute the integral image for pixel values
  const integralImage = new Uint32Array(integralWidth * (height + 1))
  // Compute the integral image for squared pixel values
  const integralImageSq = new Float64Array(integralWidth * (height + 1))

  for (let y = 1; y <= height; y++) {
    let rowSum = 0
    let rowSumSq = 0
    const grayscaleIdx = (y - 1) * width - 1
    const integralIdx = (y - 1) * integralWidth
    for (let x = 1; x <= width; x++) {
      const value = grayscaleData[grayscaleIdx+x]
      rowSum += value
      rowSumSq += value * value

      integralImage[integralIdx + integralWidth + x] =
        integralImage[integralIdx + x] + rowSum

      integralImageSq[integralIdx + integralWidth + x] =
        integralImageSq[integralIdx+x] + rowSumSq
    }
  }

  // Apply adaptive thresholding using the integral images
  const halfBlock = Math.floor(blockSize / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Define the region boundaries
      const x1 = Math.max(x - halfBlock, 0)
      const y1 = Math.max(y - halfBlock, 0)
      const x2 = Math.min(x + halfBlock, width - 1)
      const y2 = Math.min(y + halfBlock, height - 1)

      // Calculate the sum and sum of squares using the integral images
      const area = (x2 - x1 + 1) * (y2 - y1 + 1)
      const sum =
        integralImage[(y2 + 1) * integralWidth + (x2 + 1)] -
        integralImage[(y2 + 1) * integralWidth + x1] -
        integralImage[y1 * integralWidth + (x2 + 1)] +
        integralImage[y1 * integralWidth + x1]

      const sumSq =
        integralImageSq[(y2 + 1) * integralWidth + (x2 + 1)] -
        integralImageSq[(y2 + 1) * integralWidth + x1] -
        integralImageSq[y1 * integralWidth + (x2 + 1)] +
        integralImageSq[y1 * integralWidth + x1]

      // Calculate the mean and variance
      const mean = sum / area
      const variance = sumSq / area - mean * mean
      const stdDev = Math.sqrt(variance)

      // Use the local mean and standard deviation to set the threshold
      const threshold = mean - k * stdDev

      // Get the current pixel index
      const idx = (y * width + x) * 4
      const grayscaleValue = grayscaleData[y * width + x]

      // Apply the threshold
      const value = grayscaleValue >= threshold ? 255 : 0
      data[idx] = value // Red
      data[idx + 1] = value // Green
      data[idx + 2] = value // Blue
    }
  }

  // Put the modified image data back to the canvas
  ctx.putImageData(imageData, 0, 0)
}

function adaptiveThresholdOtsuLocal(ctx: CanvasRenderingContext2D, _: number, blockSize: number = 5): void {
  const { width, height } = ctx.canvas

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Create a copy of the original grayscale data for calculations
  const grayscaleData = new Uint8Array(width * height)

  // Convert the image to grayscale and store in grayscaleData
  for (let i = 0; i < data.length; i += 4) {
    grayscaleData[i / 4] = toGrayscale(data[i], data[i+1], data[i+2])
  }

  const histogram = new Uint8Array(256)

  // Apply adaptive thresholding using local Otsu's method
  const halfBlock = Math.floor(blockSize / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Define the region boundaries
      const x1 = Math.max(x - halfBlock, 0)
      const y1 = Math.max(y - halfBlock, 0)
      const x2 = Math.min(x + halfBlock, width - 1)
      const y2 = Math.min(y + halfBlock, height - 1)

      let localPixelsCount = 0
      histogram.fill(0)
      // Compute the histogram of the local neighborhood
      for (let ny = y1; ny <= y2; ny++) {
        for (let nx = x1; nx <= x2; nx++) {
          const idx = ny * width + nx
          localPixelsCount++
          histogram[grayscaleData[idx]]++
        }
      }

      // Apply Otsu's method to find the optimal threshold
      let sum = 0
      for (let i = 0; i < 256; i++) {
        sum += i * histogram[i]
      }

      let sumB = 0
      let wB = 0
      let wF = 0
      let maxVariance = 0
      let threshold = 0

      for (let i = 0; i < 256; i++) {
        wB += histogram[i]
        if (wB === 0) continue

        wF = localPixelsCount - wB
        if (wF === 0) break

        sumB += i * histogram[i]

        const mB = sumB / wB
        const mF = (sum - sumB) / wF

        const variance = wB * wF * (mB - mF) * (mB - mF)
        if (variance > maxVariance) {
          maxVariance = variance
          threshold = i
        }
      }

      // Get the current pixel index
      const idx = (y * width + x) * 4
      const grayscaleValue = grayscaleData[y * width + x]

      // Apply the threshold
      const value = grayscaleValue > threshold ? 255 : 0
      data[idx] = value // Red
      data[idx + 1] = value // Green
      data[idx + 2] = value // Blue
    }
  }

  // Put the modified image data back to the canvas
  ctx.putImageData(imageData, 0, 0)
}

function adaptiveThresholdOtsuGlobal(ctx: CanvasRenderingContext2D): void {
  // Get canvas dimensions from local variables
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  const data = imageData.data

  // Create a copy of the original grayscale data for calculations
  const grayscaleData = new Uint8Array(canvasWidth * canvasHeight)

  // Convert the image to grayscale and store in grayscaleData
  for (let i = 0; i < data.length; i += 4) {
    grayscaleData[i / 4] = toGrayscale(data[i], data[i+1], data[i+2])
  }

  // Compute the histogram of the grayscale image
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < grayscaleData.length; i++) {
    histogram[grayscaleData[i]]++
  }

  // Compute the total number of pixels
  const totalPixels = canvasWidth * canvasHeight

  // Compute the sum of all pixel values
  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]
  }

  // Apply Otsu's method to find the optimal threshold
  let sumB = 0
  let wB = 0
  let wF = 0
  let maxVariance = 0
  let threshold = 0

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue

    wF = totalPixels - wB
    if (wF === 0) break

    sumB += t * histogram[t]

    const mB = sumB / wB
    const mF = (sum - sumB) / wF

    const varianceBetween = wB * wF * (mB - mF) * (mB - mF)
    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween
      threshold = t
    }
  }

  // Apply the threshold to binarize the image
  for (let i = 0; i < data.length; i += 4) {
    const grayscaleValue = grayscaleData[i / 4]
    const value = grayscaleValue > threshold ? 255 : 0
    data[i] = value // Red
    data[i + 1] = value // Green
    data[i + 2] = value // Blue
  }

  // Put the modified image data back to the canvas
  ctx.putImageData(imageData, 0, 0)
}
