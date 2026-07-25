function RecipeTable({ recipes = [], onSelect, selectedId }) {
  if (recipes.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="border-b border-outline-variant text-label-caps text-9px text-on-surface-variant">
            <th className="p-3 font-weight-normal">Nombre</th>
            <th className="p-3 font-weight-normal">Especie</th>
            <th className="p-3 font-weight-normal">Fases</th>
            <th className="p-3 font-weight-normal">Dificultad</th>
            <th className="p-3 font-weight-normal">Rendimiento</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map(recipe => (
            <tr
              key={recipe.id}
              className={`border-b border-outline-variant hover:bg-surface-container-highest/40 transition-colors cursor-pointer ${
                recipe.id === selectedId ? 'bg-primary/5' : ''
              }`}
              onClick={() => onSelect?.(recipe)}
            >
              <td className="p-3 text-body-sm text-on-surface">{recipe.name}</td>
              <td className="p-3 text-body-sm text-on-surface-variant">{recipe.Species?.commonName || '—'}</td>
              <td className="p-3 text-body-sm text-on-surface-variant">{recipe.phases?.length || 0} fases</td>
              <td className="p-3 text-body-sm text-on-surface-variant">{recipe.difficulty || '—'}</td>
              <td className="p-3 text-body-sm text-on-surface-variant">{recipe.expectedYield ? `${recipe.expectedYield}g` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RecipeTable
