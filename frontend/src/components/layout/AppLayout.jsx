import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className={`app-main ${sidebarOpen ? '' : ''}`}>
        <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <div className="app-content animate-fadeIn">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
