// SmoothScroll.tsx
// DISABLED — Custom JS LERP scroll interceptor was causing lag/vibration
// because it hijacked the wheel event with preventDefault() and fought against
// the browser's own GPU-accelerated compositor scroll.
//
// Native scroll-behavior: smooth (set in globals.css) is used instead.
// It runs on the compositor thread with no JS overhead and no jank.

export default function SmoothScroll() {
  return null;
}
