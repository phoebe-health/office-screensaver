import { useLiveData } from '../shared/useLiveData'
import type { TextsData } from '../shared/types'
import { theme } from '../shared/theme'

// PLACEHOLDER — replaced by the Texts globe build.
export function TextsGlobe() {
  const data = useLiveData<TextsData>('./data/texts.json')
  return (
    <div style={{ color: theme.text, padding: 24, fontFamily: 'monospace' }}>
      texts placeholder · {data ? `${data.rate.textsPerMinute}/min` : 'loading…'}
    </div>
  )
}
