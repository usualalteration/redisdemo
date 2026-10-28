import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

/** Number that smoothly tweens whenever its value changes. */
export function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const display = useTransform(motionValue, (latest) =>
    Math.round(latest).toLocaleString("en-US"),
  );
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => motionValue.set(latest),
    });
    return () => controls.stop();
  }, [value, motionValue]);

  return <motion.span className="tabular-nums">{display}</motion.span>;
}