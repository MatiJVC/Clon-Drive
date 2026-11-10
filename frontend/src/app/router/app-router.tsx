import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { AuthPage } from '@/features/auth/auth-page'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/session-gates'
import { DrivePage } from '@/features/drive/drive-page'
import { SharedPage } from '@/features/drive/shared-page'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/drive" element={<DrivePage />} />
          <Route path="/drive/shared" element={<SharedPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/drive" replace />} />
    </Routes>
  )
}
