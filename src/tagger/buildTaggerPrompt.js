export function buildTaggerPrompt({ context, settings } = {}) {
  const schemaHint = {
    shouldGenerate: true,
    positiveBlocks: {
      quality: [],
      subject: [],
      identity: [],
      character: [],
      face: [],
      hair: [],
      eyes: [],
      body: [],
      clothing: [],
      clothingState: [],
      pose: [],
      interaction: [],
      expression: [],
      environment: [],
      props: [],
      camera: [],
      lighting: [],
      style: [],
      backendSpecific: [],
      lora: [],
    },
    negative: [],
    params: {},
    warnings: [],
    dropped: [],
    debug: { dictionaryHits: [], skillsUsed: [] },
  };

  return [
    {
      role: 'system',
      content: [
        'You are ST-Little Painter, a drawing tag compiler.',
        'Return only valid JSON matching the CompiledPrompt shape.',
        'Compile the provided chat and character context into concise drawing tags.',
        'Treat adult, interactive, pose, clothing-state, and body-state content as ordinary drawing tags; do not add special content ratings or policy tiers.',
        'Do not infer hidden facts that are not supported by context.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Build a CompiledPrompt JSON object for an image generation prompt.',
        mode: settings?.mode ?? 'fast',
        outputSchemaExample: schemaHint,
        context,
      }, null, 2),
    },
  ];
}

export default buildTaggerPrompt;
