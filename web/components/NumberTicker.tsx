'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/**
 * Counts up to `value` when it scrolls into view. Ported from Magic UI's
 * Number Ticker (spring-driven, direct textContent writes to skip React
 * re-renders on every tick) onto the `motion` package used elsewhere here.
 */
export default function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (shouldReduceMotion) {
      if (ref.current) ref.current.textContent = Intl.NumberFormat('en-US').format(value);
      return;
    }
    motionValue.set(value);
  }, [isInView, value, motionValue, shouldReduceMotion]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = Intl.NumberFormat('en-US').format(Math.round(latest));
    });
  }, [springValue]);

  return <span ref={ref}>0</span>;
}
