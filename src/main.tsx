import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import '@neondatabase/neon-js/ui/css'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui'
import { authClient } from './auth'
import { authLocalization } from './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><NeonAuthUIProvider authClient={authClient} social={{providers:["google"]}} localization={authLocalization}><App /></NeonAuthUIProvider></React.StrictMode>,
)
