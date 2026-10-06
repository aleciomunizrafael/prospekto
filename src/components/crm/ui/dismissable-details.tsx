"use client";

import { useEffect, useRef, type ReactNode } from "react";

// <details> que também fecha com Esc e com clique ou toque fora, como os menus da Toolbar.
// Continua sendo um <details> nativo (abre sem JavaScript e dentro de um <form>).
export function DismissableDetails({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !el.open) return;
      el.open = false;
      el.querySelector("summary")?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!el.open || (event.target instanceof Node && el.contains(event.target))) return;
      el.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);
  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
