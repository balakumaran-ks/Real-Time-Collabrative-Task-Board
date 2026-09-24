import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { WorkspacesPage } from '@/pages/WorkspacesPage'
import { BoardsPage } from '@/pages/BoardsPage'
import { BoardPage } from '@/pages/BoardPage'
import { MembersPage } from '@/pages/MembersPage'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <WorkspacesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:workspaceId/boards"
          element={
            <ProtectedRoute>
              <BoardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:workspaceId/members"
          element={
            <ProtectedRoute>
              <MembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/boards/:boardId"
          element={
            <ProtectedRoute>
              <BoardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
