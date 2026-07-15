import Sidebar from '../Sidebar/Sidebar'
import TopBar from '../TopBar/TopBar'
import BottomNav from '../BottomNav/BottomNav'
import StatusFooter from '../StatusFooter/StatusFooter'
import OfflineBanner from '../../shared/components/OfflineBanner.jsx'

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="app-content">
        <OfflineBanner />
        {children}
      </main>
      <BottomNav />
      <StatusFooter />
    </div>
  )
}

export default AppShell
