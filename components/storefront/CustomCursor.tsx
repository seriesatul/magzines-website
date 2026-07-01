"use client";

import { useEffect, useState } from "react";

type CursorState = {
  x: number;
  y: number;
  isActive: boolean;
  isHoveringTarget: boolean;
};

export function CustomCursor(): React.ReactElement {
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    isActive: false,
    isHoveringTarget: false
  });

  useEffect(() => {
    const canUseFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (!canUseFinePointer) {
      return;
    }

    function moveCursor(event: MouseEvent): void {
      const target = event.target;
      const isHoveringTarget =
        target instanceof Element && Boolean(target.closest("a, button"));

      setCursor({
        x: event.clientX,
        y: event.clientY,
        isActive: true,
        isHoveringTarget
      });
    }

    function hideCursor(): void {
      setCursor((current) => ({ ...current, isActive: false }));
    }

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseleave", hideCursor);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseleave", hideCursor);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[10000] hidden rounded-full border border-brand mix-blend-multiply transition-[height,width,opacity] duration-300 ease-out lg:block ${
        cursor.isHoveringTarget ? "h-10 w-10" : "h-2 w-2 bg-brand"
      } ${cursor.isActive ? "opacity-100" : "opacity-0"}`}
      style={{
        transform: `translate3d(${cursor.x - (cursor.isHoveringTarget ? 20 : 4)}px, ${
          cursor.y - (cursor.isHoveringTarget ? 20 : 4)
        }px, 0)`
      }}
    />
  );
}
