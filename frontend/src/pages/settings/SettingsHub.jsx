import { useNavigate } from 'react-router-dom'

const HUB_CARDS = [
  {
    to: '/settings/user',
    icon: 'fingerprint',
    title: 'User',
    subtitle: 'Profile, security & access',
    color: 'secondary',
  },
  {
    to: '/settings/device',
    icon: 'developer_board',
    title: 'Device',
    subtitle: 'Hardware & calibration',
    color: 'primary',
  },
  {
    to: '/settings/cultivation',
    icon: 'potted_plant',
    title: 'Cultivation',
    subtitle: 'Parameters, recipes & cycles',
    color: 'tertiary',
  },
  {
    to: '/settings/api-keys',
    icon: 'vpn_key',
    title: 'API Keys',
    subtitle: 'Manage programmatic access & integration',
    color: 'secondary',
  },
  {
    to: '/settings/subscription',
    icon: 'workspace_premium',
    title: 'Suscripción',
    subtitle: 'Plan, límites API & retención de datos',
    color: 'primary',
  },
  {
    to: '/settings/system',
    icon: 'settings',
    title: 'System',
    subtitle: 'Global configuration & parameters',
    color: 'tertiary',
  },
]

function SettingsHub() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-headline-lg text-on-surface mb-1">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HUB_CARDS.map(card => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            className="glass-card p-6 rounded-xl border border-outline-variant text-left cursor-pointer hover:bg-surface-container-high transition-all duration-300"
          >
            <h3 className="text-headline-md text-on-surface mb-1">{card.title}</h3>
            <p className="text-body-md text-on-surface-variant">{card.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SettingsHub
