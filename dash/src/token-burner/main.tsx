import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TokenBurner } from './TokenBurner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokenBurner />
  </StrictMode>,
)
