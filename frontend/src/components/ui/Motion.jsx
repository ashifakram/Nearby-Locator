import React from 'react';
import { motion } from 'framer-motion';

/**
 * Shared FadeIn animation wrapper using Framer Motion.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  direction = 'up',
  className = '',
  ...props
}) {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  };

  const initialOffset = directions[direction] || directions.up;

  return (
    <motion.div
      initial={{ opacity: 0, ...initialOffset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 1, 0.2, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shared ScaleIn animation wrapper.
 */
export function ScaleIn({
  children,
  delay = 0,
  duration = 0.3,
  className = '',
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shared Stagger Container for list item animations.
 */
export function StaggerContainer({
  children,
  staggerChildren = 0.08,
  delayChildren = 0,
  className = '',
  ...props
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shared HoverCard scale effect.
 */
export function HoverCard({
  children,
  scale = 1.02,
  className = '',
  ...props
}) {
  return (
    <motion.div
      whileHover={{ scale, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
