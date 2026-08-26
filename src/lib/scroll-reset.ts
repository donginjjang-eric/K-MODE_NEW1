type ScrollResetTarget = Pick<Window, "history" | "requestAnimationFrame" | "cancelAnimationFrame" | "scrollTo">;

export function scheduleScrollReset(target: ScrollResetTarget) {
  if ("scrollRestoration" in target.history) target.history.scrollRestoration = "manual";
  target.scrollTo(0, 0);
  let secondFrame = 0;
  const firstFrame = target.requestAnimationFrame(() => {
    secondFrame = target.requestAnimationFrame(() => target.scrollTo(0, 0));
  });

  return () => {
    target.cancelAnimationFrame(firstFrame);
    if (secondFrame) target.cancelAnimationFrame(secondFrame);
  };
}
