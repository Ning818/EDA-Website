import { createContext } from 'react'

// Who is logged in, as the pages see it (set by AuthProvider.jsx, read with useAuth.js).
export const AuthContext = createContext(null)
