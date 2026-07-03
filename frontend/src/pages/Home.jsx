import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDevices, getLatestTelemetry } from '../api/client.js'

function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ sporeDensity: 84.2, nodeConn: 0.998, totalNodes: 12482, syncRate: 99.9, totalDevices: 0 })

  useEffect(() => {
    getDevices().then(devs => {
      if (devs.length > 0) {
        setStats(prev => ({ ...prev, totalDevices: devs.length, totalNodes: devs.length * 3 }))
        Promise.all(devs.map(d => getLatestTelemetry(d.id).catch(() => null))).then(results => {
          const valid = results.filter(Boolean)
          if (valid.length > 0) {
            const hAvg = valid.filter(t => t.humidity != null).reduce((a, b) => a + b.humidity, 0) / valid.filter(t => t.humidity != null).length
            setStats(prev => ({ ...prev, sporeDensity: hAvg || prev.sporeDensity }))
          }
        })
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="pb-20">
      <section className="relative min-h-[600px] flex items-center" style={{ minHeight: '600px' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest border border-primary/30 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-primary breathing-pulse" />
            <span className="font-label-caps text-label-caps text-primary">PLATFORM OVERVIEW // ALPHA NODE</span>
          </div>
          <h2 className="text-display-data text-[clamp(40px,6vw,64px)] text-white mb-6 leading-[0.9] tracking-tight">
            NEURAL<br />MYCELIUM
          </h2>
          <p className="text-headline-md text-on-surface-variant mb-10 max-w-xl leading-relaxed">
            Real-time orchestration platform for bio-synthetic fungal networks. Monitor, control, and optimize cultivation environments with precision.
          </p>
          <div className="flex gap-4">
            <button className="btn btn-primary px-8 py-4 text-label-caps" style={{ boxShadow: '0 0 12px var(--spore-glow)' }}>
              DEPLOY PROTOCOL
            </button>
            <button className="px-8 py-4 border border-secondary text-secondary font-label-caps text-label-caps rounded hover:bg-secondary/10 transition-all" style={{ background: 'none', cursor: 'pointer' }}>
              VIEW DIAGNOSTICS
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3">
          <div className="glass-card p-4 w-64 rounded-xl">
            <div className="flex justify-between mb-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">SPORE DENSITY</span>
              <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
            </div>
            <div className="text-headline-lg text-primary">{Math.round(stats.sporeDensity)}%</div>
            <div className="w-full h-1 bg-surface-container-high mt-3 overflow-hidden rounded">
              <div className="h-full bg-primary w-4/5 rounded" />
            </div>
          </div>
          <div className="glass-card p-4 w-64 rounded-xl">
            <div className="flex justify-between mb-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant">NODE CONNECTIVITY</span>
              <span className="material-symbols-outlined text-secondary text-sm">hub</span>
            </div>
            <div className="text-headline-lg text-secondary">{stats.nodeConn}</div>
            <div className="mt-3 flex gap-1 h-8 items-end">
              {[30, 75, 100, 80, 50, 75].map((h, i) => (
                <div key={i} className="w-1 bg-secondary rounded-t" style={{ height: `${h}%`, opacity: h === 100 ? 1 : h > 60 ? 0.7 : 0.4 }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 auto-rows-[280px]">
          <div className="lg:col-span-2 glass-card relative group overflow-hidden rounded-xl border border-outline-variant">
            <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-110 bg-surface-container-high">
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <span className="material-symbols-outlined text-96px text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>science</span>
              </div>
            </div>
            <div className="relative z-10 p-5 h-full flex flex-col justify-between">
              <div>
                <span className="font-label-caps text-label-caps text-primary bg-primary/10 px-2 py-1 border border-primary/20 rounded">MODULE 01</span>
                <h4 className="text-headline-lg mt-4 text-white">CHAMBER CONTROL</h4>
                <p className="text-body-md text-on-surface-variant max-w-sm mt-1">Precision environmental oversight for sensitive mycelium cultivation.</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-label-caps text-10px text-on-surface-variant">ACTIVE UNITS:</span>
                  <span className="text-headline-md text-primary">{stats.totalDevices}</span>
                </div>
                <button className="bg-surface border border-outline px-4 py-2 font-label-caps text-label-caps hover:bg-surface-bright rounded cursor-pointer" style={{ border: '1px solid var(--outline)' }}>
                  ACCESS PANEL
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-outline-variant border-t-2 border-t-secondary flex flex-col">
            <header className="flex justify-between items-start mb-5">
              <div className="w-10 h-10 bg-secondary/10 flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-secondary">receipt</span>
              </div>
              <span className="text-data-sm text-data-sm text-secondary">RECIPE V4</span>
            </header>
            <h4 className="text-headline-lg text-white mb-2">Recipe Orchestration</h4>
            <p className="text-body-md text-on-surface-variant flex-1">Algorithmic strain optimization. Automate the delicate balance of substrate and nutrient delivery.</p>
            <div className="mt-4 p-1 bg-surface-container-low border border-outline-variant rounded flex items-center justify-between px-3 py-2">
              <span className="font-label-caps text-10px text-on-surface-variant">OPTIMIZATION ENGINE</span>
              <div className="w-4 h-4 bg-secondary rounded-full breathing-pulse" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-outline-variant border-t-2 border-t-tertiary flex flex-col">
            <header className="flex justify-between items-start mb-5">
              <div className="w-10 h-10 bg-tertiary/10 flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-tertiary">local_shipping</span>
              </div>
              <span className="text-data-sm text-data-sm text-tertiary">LOGISTICS</span>
            </header>
            <h4 className="text-headline-lg text-white mb-2">Harvest Logistics</h4>
            <p className="text-body-md text-on-surface-variant flex-1">End-to-end supply chain integration. From spore selection to global distribution networks.</p>
            <div className="mt-4 flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border border-surface bg-surface-bright" />
              ))}
              <div className="w-8 h-8 rounded-full border border-surface bg-surface-bright flex items-center justify-center text-10px font-bold text-on-surface-variant">+8</div>
            </div>
          </div>

          <div className="lg:col-span-2 glass-card p-5 rounded-xl border border-outline-variant overflow-hidden relative">
            <header className="flex justify-between items-center mb-5 relative z-10">
              <h4 className="font-label-caps text-label-caps text-white">REAL-TIME GLOBAL MAPPING</h4>
              <span className="text-data-sm text-data-sm text-on-surface-variant">LATENCY: 12MS</span>
            </header>
            <div className="absolute inset-0 z-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 800 400">
                <circle className="breathing-pulse" cx="200" cy="150" fill="#6bfb9a" r="4" />
                <circle className="breathing-pulse" cx="450" cy="250" fill="#6bfb9a" r="4" />
                <circle className="breathing-pulse" cx="600" cy="100" fill="#6bfb9a" r="4" />
                <path d="M200,150 Q325,200 450,250" fill="none" stroke="#6bfb9a" strokeWidth="1" className="bioluminescent-path" />
                <path d="M450,250 Q525,175 600,100" fill="none" stroke="#6bfb9a" strokeWidth="1" className="bioluminescent-path" />
              </svg>
            </div>
            <div className="relative z-10 flex justify-between items-end h-[calc(100%-40px)]">
              <div className="flex gap-8">
                <div>
                  <span className="font-label-caps text-10px text-on-surface-variant block mb-1">TOTAL NODES</span>
                  <span className="text-headline-lg text-primary">{stats.totalNodes.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-label-caps text-10px text-on-surface-variant block mb-1">SYNC RATE</span>
                  <span className="text-headline-lg text-secondary">{stats.syncRate}%</span>
                </div>
              </div>
              <button className="px-6 py-2 border border-primary/40 text-primary font-label-caps text-label-caps hover:bg-primary/10 transition-colors rounded cursor-pointer" style={{ background: 'none' }}>
                OPEN GLOBAL HUD
              </button>
            </div>
          </div>
        </div>
      </section>

      <button
        className="fixed bottom-10 right-10 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
        style={{ border: 'none', boxShadow: '0 0 20px rgba(74,222,128,0.4)' }}
        onClick={() => navigate('/dashboard')}
      >
        <span className="material-symbols-outlined text-2xl">dashboard</span>
      </button>
    </div>
  )
}

export default Home
