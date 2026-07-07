import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/tokens.css'
import { TokenBurner } from './TokenBurner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokenBurner />
  </StrictMode>,
)
