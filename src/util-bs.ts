
const bootstrapBreakpoints = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'] as const

type BootstrapBreakpoint = (typeof bootstrapBreakpoints)[number]

export function detectBootstrapBreakpoint(): BootstrapBreakpoint | null {
  const values = getBreakpointWidths()
  for (const breakpoint of bootstrapBreakpoints) {
    if (window.matchMedia(`(min-width: ${values[breakpoint]})`).matches) {
      return breakpoint
    }
  }
  return null
}

let breakpointWidths: Record<BootstrapBreakpoint, string> | undefined

function getBreakpointWidths(): Record<BootstrapBreakpoint, string> {
  if (breakpointWidths) {
    return breakpointWidths
  }

  const widths: Record<string, string> = {}
  for (const breakpoint of bootstrapBreakpoints) {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(`--bs-breakpoint-${breakpoint}`)
    if (value) {
      widths[breakpoint] = value
    }
  }
  breakpointWidths = widths
  return widths
}
