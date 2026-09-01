import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-64px text-error mb-4">lock</span>
      <h1 className="text-headline-lg text-on-surface mb-2">Acceso denegado</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Tu rol no tiene permiso para ver esta página.
      </p>
      <p className="text-body-sm text-outline">Comunícate con un administrador si crees que es un error.</p>
    </div>
  )
}

function RequireRole({ allowed = [], children }) {
  const { user } = useAuth()
  const location = useLocation()

  const role = user?.role
  if (role && allowed.includes(role)) return children
  return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />
}

export default RequireRole
export { ForbiddenPage }
