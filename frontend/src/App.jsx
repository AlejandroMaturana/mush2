import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './app/providers/AuthProvider'
import AppShell from './layouts/AppShell/AppShell'
import { AlarmProvider } from './app/providers/AlarmProvider'
import { publicRoutes, protectedRoutes } from './app/routes'
import LoadingState from './shared/components/LoadingState'

function AppRoutes({ routes, isProtected }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        {routes.map((route) =>
          route.children ? (
            <Route
              key={route.path}
              path={route.path}
              element={<route.element />}
            >
              {route.children.map((child) => (
                <Route
                  key={child.path || 'index'}
                  index={child.index}
                  path={child.path}
                  element={<child.element />}
                />
              ))}
            </Route>
          ) : (
            <Route
              key={route.path}
              path={route.path}
              element={<route.element />}
            />
          )
        )}
      </Routes>
    </Suspense>
  )
}

function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {!user ? (
        <AppRoutes routes={publicRoutes} isProtected={false} />
      ) : (
        <AlarmProvider>
          <AppShell>
            <AppRoutes routes={protectedRoutes} isProtected />
          </AppShell>
        </AlarmProvider>
      )}
    </BrowserRouter>
  )
}

export default App
