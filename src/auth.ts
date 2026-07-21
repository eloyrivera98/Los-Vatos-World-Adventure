import { createAuthClient, createInternalNeonAuth } from '@neondatabase/neon-js/auth'
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react'

const authUrl=import.meta.env.VITE_NEON_AUTH_URL
if(!authUrl) throw new Error('Falta VITE_NEON_AUTH_URL en el entorno')
export const neonAuth=createInternalNeonAuth(authUrl,{adapter:BetterAuthReactAdapter()})
export const authClient=createAuthClient(authUrl,{adapter:BetterAuthReactAdapter()})