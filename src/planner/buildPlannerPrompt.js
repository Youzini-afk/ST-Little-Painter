import { createEmptyScenePlan } from './scenePlanSchema.js';

export function buildPlannerPrompt({ context, settings } = {}) {
  return [
    {
      role: 'system',
      content: [
        'You are ST-Little Painter scene planner.',
        'Return only valid JSON matching the ScenePlan shape.',
        'Extract a compact visual scene plan from chat, character, and worldbook context before tag compilation.',
        'Do not invent unsupported facts. Preserve important visual constraints and uncertainties as warnings.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Build a ScenePlan JSON object for a downstream drawing tag compiler.',
        mode: settings?.mode ?? 'smart',
        outputSchemaExample: createEmptyScenePlan(),
        context,
      }, null, 2),
    },
  ];
}

export default buildPlannerPrompt;
