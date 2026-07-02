import Sidebar from './Sidebar'
import TopBar from './TopBar'
import StatusFooter from './StatusFooter'

function AppShell({ user, onLogout, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar user={user} onLogout={onLogout} />
      <main className="app-content">
        {children}
      </main>
      <StatusFooter />
    </div>
  )
}

export default AppShell
