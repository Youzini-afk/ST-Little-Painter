export const REGEX_STAGES = Object.freeze({
  INPUT_CLEANUP: 'input_cleanup',
  WORLDBOOK_CLEANUP: 'worldbook_cleanup',
  PLANNER_INPUT_CLEANUP: 'planner_input_cleanup',
  LLM_OUTPUT_CLEANUP: 'llm_output_cleanup',
  JSON_REPAIR_CLEANUP: 'json_repair_cleanup',
  FINAL_TAG_CLEANUP: 'final_tag_cleanup',
  BACKEND_PROMPT_CLEANUP: 'backend_prompt_cleanup',
});

export const input_cleanup = REGEX_STAGES.INPUT_CLEANUP;
export const worldbook_cleanup = REGEX_STAGES.WORLDBOOK_CLEANUP;
export const planner_input_cleanup = REGEX_STAGES.PLANNER_INPUT_CLEANUP;
export const llm_output_cleanup = REGEX_STAGES.LLM_OUTPUT_CLEANUP;
export const json_repair_cleanup = REGEX_STAGES.JSON_REPAIR_CLEANUP;
export const final_tag_cleanup = REGEX_STAGES.FINAL_TAG_CLEANUP;
export const backend_prompt_cleanup = REGEX_STAGES.BACKEND_PROMPT_CLEANUP;

export default REGEX_STAGES;
