import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type PropsWithChildren, useCallback, useEffect, useMemo, useReducer } from 'react'
import { queryKeys } from '@/app/query-keys'
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/auth-context-value'
import { tokenStorage } from '@/features/auth/token-storage'
import { authApi, type Credentials } from '@/services/api/auth'
import type { AuthSession } from '@/types/api'

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [, refreshSession] = useReducer((value: number) => value + 1, 0)
  const hasToken = tokenStorage.has()
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: hasToken,
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.all })
      refreshSession()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [queryClient])

  const establishSession = useCallback(async (session: AuthSession) => {
    await queryClient.cancelQueries()
    queryClient.clear()
    tokenStorage.set(session.accessToken)
    queryClient.setQueryData(queryKeys.auth.me(), session.user)
    refreshSession()
    return session.user
  }, [queryClient])

  const login = useCallback(async (credentials: Credentials) => {
    return establishSession(await authApi.login(credentials))
  }, [establishSession])

  const register = useCallback(async (credentials: Credentials) => {
    return establishSession(await authApi.register(credentials))
  }, [establishSession])

  const logout = useCallback(async () => {
    await queryClient.cancelQueries()
    tokenStorage.clear()
    queryClient.clear()
    refreshSession()
  }, [queryClient])

  const retryVerification = useCallback(async () => {
    await meQuery.refetch()
  }, [meQuery])

  let status: AuthStatus
  if (!hasToken) status = 'unauthenticated'
  else if (meQuery.isPending || meQuery.isFetching) status = 'checking'
  else if (meQuery.isError) status = 'verification-error'
  else status = 'authenticated'

  const value = useMemo<AuthContextValue>(() => ({
    user: status === 'authenticated' ? (meQuery.data ?? null) : null,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    register,
    logout,
    retryVerification,
  }), [status, meQuery.data, login, register, logout, retryVerification])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
