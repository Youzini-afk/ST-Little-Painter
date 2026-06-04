import { createBMEWorldbookResolverAdapter } from './BMEWorldbookResolverAdapter.js';

export function createWorldbookContextProvider({ resolver } = {}) {
  const activeResolver = resolver ?? createBMEWorldbookResolverAdapter();

  return {
    async resolveWorldbookContext({ context = {}, settings = {} } = {}) {
      // 完整 BME 语义通过 adapter 未来接入，不在业务层简化。
      return activeResolver.resolveWorldbookContext({ context, settings });
    },
  };
}

export default createWorldbookContextProvider;
