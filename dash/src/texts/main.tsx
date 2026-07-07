import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/tokens.css'
import { TextsGlobe } from './TextsGlobe'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TextsGlobe />
  </StrictMode>,
)
