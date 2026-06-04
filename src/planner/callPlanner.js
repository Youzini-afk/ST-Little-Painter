import { callJson } from '../llm/callJson.js';
import { normalizeScenePlan } from './scenePlanSchema.js';

export async function callPlanner({ settings, messages } = {}) {
  const response = await callJson({ settings, messages });
  return {
    ...response,
    parsed: response.parsed ? normalizeScenePlan(response.parsed) : null,
  };
}

export default callPlanner;
