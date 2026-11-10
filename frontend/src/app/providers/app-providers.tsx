import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/app/providers/query-client'
import { AuthProvider } from '@/features/auth/auth-context'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
