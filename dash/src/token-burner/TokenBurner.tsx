import { useLiveData } from '../shared/useLiveData'
import type { TokenBurnerData } from '../shared/types'
import { theme } from '../shared/theme'

// PLACEHOLDER — replaced by the Token Burner build. Renders the raw rate so the
// skeleton compiles and the data contract is exercised.
export function TokenBurner() {
  const data = useLiveData<TokenBurnerData>('./data/token-burner.json')
  return (
    <div style={{ color: theme.text, padding: 24, fontFamily: 'monospace' }}>
      token-burner placeholder · {data ? `${data.rate.tokensPerSecond} tok/s` : 'loading…'}
    </div>
  )
}
