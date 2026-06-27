import { createContext, useContext } from 'react'
import { loadUser } from '../utils/storage'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const user = loadUser()
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext) || loadUser()
}
