function RecipesEmptyState({ onCreate }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-container-padding text-center space-y-6 py-16">
      <div className="max-w-md w-full">
        <div className="w-full h-auto rounded-xl border border-outline-variant/30 mb-8 bg-surface-container-low flex items-center justify-center py-16"
          style={{ boxShadow: '0 0 12px rgba(74,222,128,0.1)' }}>
          <span className="material-symbols-outlined text-96px text-on-surface-variant opacity-20" style={{ fontVariationSettings: '"FILL" 1' }}>potted_plant</span>
        </div>
        <h2 className="text-headline-lg text-headline-lg text-primary mb-4">PROTOCOL REGISTRY EMPTY</h2>
        <p className="text-body-md text-on-surface-variant mb-8">
          The system has no stored growth recipes. Define a new bio-protocol to automate Chamber environmental parameters and nutrient delivery.
        </p>
        <button
          onClick={onCreate}
          className="btn btn-primary"
          style={{ padding: '12px 32px', boxShadow: '0 0 12px rgba(74,222,128,0.2)' }}
        >
          <span className="material-symbols-outlined text-18px">add</span>
          CREATE RECIPE
        </button>
      </div>
    </div>
  )
}

export default RecipesEmptyState
