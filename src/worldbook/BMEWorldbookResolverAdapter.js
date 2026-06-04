function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function readWorldbookFacts(worldbook = {}) {
  return [
    ...asArray(worldbook.visualFacts),
    ...asArray(worldbook.facts),
    ...asArray(worldbook.manualVisualFacts),
  ];
}

function readWorldbookConstraints(worldbook = {}) {
  return [
    ...asArray(worldbook.constraints),
    ...asArray(worldbook.manualConstraints),
  ];
}

export function createBMEWorldbookResolverAdapter({ delegate = null } = {}) {
  return {
    async resolveWorldbookContext({ context = {}, settings = {} } = {}) {
      // 完整 BME 语义通过 adapter 未来接入，不在业务层简化；delegate 预留给完整 resolver。
      if (delegate && typeof delegate.resolveWorldbookContext === 'function') {
        return delegate.resolveWorldbookContext({ context, settings });
      }

      const worldbookSettings = settings.worldbook ?? {};
      const contextWorldbook = context.worldbook ?? {};
      const visualFacts = [
        ...asArray(worldbookSettings.manualVisualFacts),
        ...readWorldbookFacts(contextWorldbook),
      ];
      const constraints = [
        ...asArray(worldbookSettings.manualConstraints),
        ...readWorldbookConstraints(contextWorldbook),
      ];

      return {
        visualFacts,
        constraints,
        entries: Array.isArray(contextWorldbook.entries) ? contextWorldbook.entries : [],
        diagnostics: {
          source: 'adapter-shell',
          hasDelegate: false,
          visualFactCount: visualFacts.length,
          constraintCount: constraints.length,
        },
      };
    },
  };
}

export default createBMEWorldbookResolverAdapter;
