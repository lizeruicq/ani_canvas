import { EasingType, Keyframe } from '../types'

// t in [0,1] -> eased t
function applyEasing(t: number, e: EasingType): number {
  switch (e) {
    case 'linear': return t
    case 'easeIn': return t * t
    case 'easeOut': return t * (2 - t)
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'back': {
      const c1 = 1.70158, c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }
    case 'elastic': {
      if (t === 0 || t === 1) return t
      const c4 = (2 * Math.PI) / 3
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    }
    case 'bounce': {
      const n1 = 7.5625, d1 = 2.75
      if (t < 1 / d1) return n1 * t * t
      if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75 }
      if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375 }
      t -= 2.625 / d1; return n1 * t * t + 0.984375
    }
  }
}

// 在指定帧采样关键帧轨道;无关键帧则返回 baseValue
export function sampleKeyframes(
  kfs: Keyframe[] | undefined,
  frame: number,
  baseValue: number,
): number {
  if (!kfs || kfs.length === 0) return baseValue
  const n = kfs.length
  // 关键帧数组在写入时始终维护为按 frame 升序 (见 store/dsl 逻辑),
  // 因此这里直接二分查找,无需再排序,避免每次 clone+sort。
  const first = kfs[0]
  if (frame <= first.frame) return first.value
  const last = kfs[n - 1]
  if (frame >= last.frame) return last.value
  // 二分查找 frame 所在的区间 [lo, hi]
  let lo = 0, hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (kfs[mid].frame <= frame) lo = mid
    else hi = mid
  }
  const a = kfs[lo], b = kfs[hi]
  const span = b.frame - a.frame || 1
  const t = (frame - a.frame) / span
  const eased = applyEasing(t, b.easing) // 区段缓动取右端关键帧的 easing
  return a.value + (b.value - a.value) * eased
}
