// Get animation trigger
const trigger = element.animations?.trigger || "load"

// Set up animation props based on animation type
const getAnimationProps = () => {
  if (!element.animations || !element.animations.enabled) return {}

  const { type, duration, delay, repeat, ease, direction, angle, distance, intensity } = element.animations
  const transition = {
    duration,
    delay,
    repeat: repeat === Number.POSITIVE_INFINITY || repeat === "Infinity" ? Number.POSITIVE_INFINITY : repeat || 0,
    ease,
  }

  // Base animation variants
  let variants: any = {}

  switch (type) {
    case "fade":
      variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        hover: { opacity: 0.7 },
        tap: { opacity: 0.5 },
      }
      break
    case "slide":
      // Handle different slide directions
      if (direction === "left" || !direction) {
        variants = {
          hidden: { x: -(distance || 100), opacity: 0 },
          visible: { x: 0, opacity: 1 },
          hover: { x: -(distance || 100) * 0.1 },
          tap: { x: -(distance || 100) * 0.05 },
        }
      } else if (direction === "right") {
        variants = {
          hidden: { x: distance || 100, opacity: 0 },
          visible: { x: 0, opacity: 1 },
          hover: { x: (distance || 100) * 0.1 },
          tap: { x: (distance || 100) * 0.05 },
        }
      } else if (direction === "up") {
        variants = {
          hidden: { y: -(distance || 100), opacity: 0 },
          visible: { y: 0, opacity: 1 },
          hover: { y: -(distance || 100) * 0.1 },
          tap: { y: -(distance || 100) * 0.05 },
        }
      } else if (direction === "down") {
        variants = {
          hidden: { y: distance || 100, opacity: 0 },
          visible: { y: 0, opacity: 1 },
          hover: { y: (distance || 100) * 0.1 },
          tap: { y: (distance || 100) * 0.05 },
        }
      }
      break
    case "scale":
      if (direction === "out") {
        variants = {
          hidden: { scale: (intensity || 1) + 1, opacity: 0 },
          visible: { scale: 1, opacity: 1 },
          hover: { scale: 1 + (intensity || 1) * 0.1 },
          tap: { scale: 1 - (intensity || 1) * 0.05 },
        }
      } else {
        variants = {
          hidden: { scale: 0, opacity: 0 },
          visible: { scale: 1, opacity: 1 },
          hover: { scale: 1 + (intensity || 1) * 0.1 },
          tap: { scale: 1 - (intensity || 1) * 0.05 },
        }
      }
      break
    case "rotate":
      variants = {
        hidden: { rotate: -(angle || 180), opacity: 0 },
        visible: { rotate: 0, opacity: 1 },
        hover: { rotate: (angle || 180) * 0.1 },
        tap: { rotate: (angle || 180) * 0.05 },
      }
      break
    case "bounce":
      // For bounce, we use a special animation
      return {
        animate: {
          y: [0, -(distance || 20), 0],
          transition: {
            duration,
            delay,
            repeat:
              repeat === Number.POSITIVE_INFINITY || repeat === "Infinity" ? Number.POSITIVE_INFINITY : repeat || 0,
            ease,
            times: [0, 0.5, 1],
          },
        },
      }
    case "pulse":
      return {
        animate: {
          scale: [1, intensity || 1.1, 1],
          transition: {
            duration,
            delay,
            repeat:
              repeat === Number.POSITIVE_INFINITY || repeat === "Infinity" ? Number.POSITIVE_INFINITY : repeat || 0,
            ease,
            times: [0, 0.5, 1],
          },
        },
      }
    case "flip":
      if (direction === "y") {
        return {
          animate: {
            rotateY: [0, 180, 360],
            transition: {
              duration,
              delay,
              repeat:
                repeat === Number.POSITIVE_INFINITY || repeat === "Infinity" ? Number.POSITIVE_INFINITY : repeat || 0,
              ease,
            },
          },
        }
      } else {
        return {
          animate: {
            rotateX: [0, 180, 360],
            transition: {
              duration,
              delay,
              repeat:
                repeat === Number.POSITIVE_INFINITY || repeat === "Infinity" ? Number.POSITIVE_INFINITY : repeat || 0,
              ease,
            },
          },
        }
      }
    default:
      variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        hover: { opacity: 0.7 },
        tap: { opacity: 0.5 },
      }
  }

  // Handle different triggers
  switch (trigger) {
    case "load":
      return {
        initial: "hidden",
        animate: "visible",
        variants,
        transition,
      }
    case "hover":
      return {
        whileHover: "hover",
        variants,
        transition,
      }
    case "click":
      return {
        whileTap: "tap",
        variants,
        transition,
      }
    case "inView":
      return {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: false, amount: 0.3 },
        variants,
        transition,
      }
    default:
      return {
        initial: "hidden",
        animate: "visible",
        variants,
        transition,
      }
  }
}

