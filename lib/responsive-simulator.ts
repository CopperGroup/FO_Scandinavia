/**
 * Responsive Simulator System
 *
 * This utility provides functions to handle responsive styling based on simulated screen widths.
 */

// Tailwind breakpoints in pixels
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
}

// Type for responsive breakpoint names
export type Breakpoint = keyof typeof BREAKPOINTS

// Add container query breakpoints to match Tailwind's default breakpoints
export const CONTAINER_BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
}

// Update this function to use standard container query syntax
export const convertToContainerQueries = (className: string): string => {
  if (!className) return ""

  return className
    .split(" ")
    .map((cls) => {
      if (cls.includes(":")) {
        // Replace standard breakpoint prefixes with @container prefixes
        return cls.replace(/(\b(?:sm|md|lg|xl|2xl):)/g, "@container-$1")
      } else if (cls.includes("max-")) {
        // Replace max-width breakpoints
        return cls.replace(/max-(sm|md|lg|xl|2xl):/g, "@container-max-$1:")
      }
      return cls
    })
    .join(" ")
}

/**
 * Get the active breakpoints for a given width
 */
export function getActiveBreakpoints(width: number): Breakpoint[] {
  const activeBreakpoints: Breakpoint[] = []

  // Add breakpoints from smallest to largest if they meet the width threshold
  if (width >= BREAKPOINTS.sm) activeBreakpoints.push("sm")
  if (width >= BREAKPOINTS.md) activeBreakpoints.push("md")
  if (width >= BREAKPOINTS.lg) activeBreakpoints.push("lg")
  if (width >= BREAKPOINTS.xl) activeBreakpoints.push("xl")
  if (width >= BREAKPOINTS["2xl"]) activeBreakpoints.push("2xl")

  return activeBreakpoints
}

/**
 * Parses width string (e.g., "768px", "100%") to number
 */
export function parseWidth(width: string): number {
  if (width === "100%") {
    // For 100%, use the window width or a fallback
    return typeof window !== "undefined" ? window.innerWidth : 1024
  }

  // Remove non-numeric characters and parse as number
  const numericWidth = Number.parseInt(width.replace(/[^0-9]/g, ""))
  return isNaN(numericWidth) ? 1024 : numericWidth
}

// Update this function to add standard container query styles
export function addContainerQueryStyles() {
  if (typeof document === "undefined") return

  // Check if the style element already exists
  let styleEl = document.getElementById("container-query-styles")
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = "container-query-styles"
    document.head.appendChild(styleEl)
  }

  // Add container query styles using standard syntax
  styleEl.textContent = `
    /* Standard container query styles */
    @container (min-width: 640px) { .\@container-sm\\:block { display: block !important; } }
    @container (min-width: 640px) { .\@container-sm\\:hidden { display: none !important; } }
    @container (min-width: 640px) { .\@container-sm\\:flex { display: flex !important; } }
    @container (min-width: 640px) { .\@container-sm\\:grid { display: grid !important; } }
    
    @container (min-width: 768px) { .\@container-md\\:block { display: block !important; } }
    @container (min-width: 768px) { .\@container-md\\:hidden { display: none !important; } }
    @container (min-width: 768px) { .\@container-md\\:flex { display: flex !important; } }
    @container (min-width: 768px) { .\@container-md\\:grid { display: grid !important; } }
    
    @container (min-width: 1024px) { .\@container-lg\\:block { display: block !important; } }
    @container (min-width: 1024px) { .\@container-lg\\:hidden { display: none !important; } }
    @container (min-width: 1024px) { .\@container-lg\\:flex { display: flex !important; } }
    @container (min-width: 1024px) { .\@container-lg\\:grid { display: grid !important; } }
    
    @container (min-width: 1280px) { .\@container-xl\\:block { display: block !important; } }
    @container (min-width: 1280px) { .\@container-xl\\:hidden { display: none !important; } }
    @container (min-width: 1280px) { .\@container-xl\\:flex { display: flex !important; } }
    @container (min-width: 1280px) { .\@container-xl\\:grid { display: grid !important; } }
    
    @container (min-width: 1536px) { .\@container-\\32xl\\:block { display: block !important; } }
    @container (min-width: 1536px) { .\@container-\\32xl\\:hidden { display: none !important; } }
    @container (min-width: 1536px) { .\@container-\\32xl\\:flex { display: flex !important; } }
    @container (min-width: 1536px) { .\@container-\\32xl\\:grid { display: grid !important; } }
  `
}

// Update the getResponsiveJS function to use standard container query syntax
export function getResponsiveJS(containerSelector = "[data-responsive-container]"): string {
  return `
    (function() {
      // Tailwind breakpoints
      const BREAKPOINTS = {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        "2xl": 1536
      };
      
      // Setup responsive behavior
      const setupResponsive = () => {
        const containers = document.querySelectorAll('${containerSelector}');
        if (!containers.length) return;
        
        containers.forEach(container => {
          // Add container query support using standard syntax
          container.style.containerType = 'inline-size';
          container.style.contain = 'layout style';
          
          // Function to update breakpoint data attributes
          const updateBreakpoints = () => {
            const containerWidth = container.getBoundingClientRect().width;
            
            // Set width attribute
            container.setAttribute('data-width', containerWidth.toString());
            
            // Remove all breakpoint attributes
            container.removeAttribute('data-bp-sm');
            container.removeAttribute('data-bp-md');
            container.removeAttribute('data-bp-lg');
            container.removeAttribute('data-bp-xl');
            container.removeAttribute('data-bp-2xl');
            
            // Add appropriate breakpoint attributes
            if (containerWidth >= BREAKPOINTS.sm) container.setAttribute('data-bp-sm', 'true');
            if (containerWidth >= BREAKPOINTS.md) container.setAttribute('data-bp-md', 'true');
            if (containerWidth >= BREAKPOINTS.lg) container.setAttribute('data-bp-lg', 'true');
            if (containerWidth >= BREAKPOINTS.xl) container.setAttribute('data-bp-xl', 'true');
            if (containerWidth >= BREAKPOINTS["2xl"]) container.setAttribute('data-bp-2xl', 'true');
          };
          
          // Initial update
          updateBreakpoints();
          
          // Create a ResizeObserver to watch for container size changes
          if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => {
              updateBreakpoints();
            });
            observer.observe(container);
          }
        });
      };
      
      // Run setup when DOM is ready or immediately if already loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupResponsive);
      } else {
        setupResponsive();
      }
      
      // Expose this function for external use
      window.updateResponsiveContainer = setupResponsive;
    })();
  `
}

// Update this function to use standard container query syntax
export function convertToContainerQueryClasses(className: string): string {
  if (!className) return ""

  return className
    .split(" ")
    .map((cls) => {
      // Check if it's a responsive class
      const match = cls.match(/^(sm|md|lg|xl|2xl):(.+)$/)
      if (match) {
        // Convert to container query class using standard syntax
        return `@container-${match[1]}:${match[2]}`
      }
      return cls
    })
    .join(" ")
}

/**
 * Injects the responsive simulator scripts into the content
 */
export function injectResponsiveSimulation(content: string, containerSelector = "[data-responsive-container]"): string {
  // Add scripts for responsive simulation
  const scripts = `<script>${getResponsiveJS(containerSelector)}</script>`

  // Check if content has a closing body or html tag
  if (content.includes("</body>")) {
    return content.replace("</body>", `${scripts}</body>`)
  } else if (content.includes("</html>")) {
    return content.replace("</html>", `${scripts}</html>`)
  } else {
    // Just append to the end if no body/html tags
    return `${content}${scripts}`
  }
}

