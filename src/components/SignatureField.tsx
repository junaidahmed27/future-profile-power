import React, { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const SignatureField: React.FC<Props> = ({ children, className }) => {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--pointer-x", `${x}%`);
    el.style.setProperty("--pointer-y", `${y}%`);
  };

  return (
    <div ref={ref} onMouseMove={onMove} className={`glow-cursor ${className || ""}`}>
      {children}
    </div>
  );
};
