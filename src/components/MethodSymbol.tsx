import { METHOD_COLORS } from '../data'

// Stable silhouettes keep the brand's close neutral colors distinguishable.
const paths: Record<string, string> = {
  ICL: 'M 7 0 A 7 7 0 1 0 -7 0 A 7 7 0 1 0 7 0',
  SkillOpt: 'M -6 -6 H 6 V 6 H -6 Z',
  SFT: 'M 0 -8 L 8 0 L 0 8 L -8 0 Z',
  RL: 'M 0 -8 L 8 6 H -8 Z',
  TTT: 'M -3 -8 H 3 V -3 H 8 V 3 H 3 V 8 H -3 V 3 H -8 V -3 H -3 Z',
}

export default function MethodSymbol({ method }: { method: string }) {
  return (
    <path
      className="method-symbol"
      d={paths[method] ?? paths.ICL}
      fill={METHOD_COLORS[method]}
      stroke="var(--series-outline)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  )
}
