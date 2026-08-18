import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', margin: '1rem 0' }}>
        Página no encontrada
      </p>
      <Link to="/overview" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
        Volver al dashboard
      </Link>
    </div>
  )
}
