// src/data/pathways/ureaCycle.js
// Declarative urea cycle. Purpose: dispose of neurotoxic ammonia as harmless urea. The
// first two steps are mitochondrial (CPS1, OTC); the rest are cytosolic. The world places
// the source stations (Nagesh's kettle for NAG, an aspartate shuttle) and the membrane
// bridge; this file holds the reaction chain and the board facts.

export const ureaCycle = {
  id: 'urea-cycle',
  name: 'The Urea Cycle',
  accent: 0x8ed64a,
  startMolecule: 'ammonia',
  startObjective: 'Ammonia is toxic. Brew NAG at Nagesh, grab 2 ATP, then wake Casper (CPS1).',

  steps: [
    {
      key: 'cps1',
      title: 'CPS1',
      station: { kind: 'character', preset: 'cps1', label: 'Casper — CPS1', prompt: 'Press E — Casper (CPS1)' },
      speaker: 'Casper the Ghost',
      color: 0xdfe7ee,
      lines: [
        '...zzz... oh! You brought NAG? Good. I do not lift a finger without N-acetylglutamate.',
        'I am the rate-limiting step. Free ammonia plus bicarbonate plus TWO ATP becomes carbamoyl phosphate.',
        'Deep in the mitochondrion, that is where the first nitrogen enters.',
      ],
      actionLabel: 'Fix the ammonia',
      requires: { NAG: 1, ATP: 2 },
      needFrom: 'Brew NAG at Nagesh’s kettle, and make sure you hold 2 ATP.',
      needHint: 'Casper stays asleep without NAG, and needs 2 ATP. Visit Nagesh’s kettle first.',
      product: 'carbamoylPhosphate',
      teach: 'Carbamoyl phosphate. CPS1 is rate-limiting; it needs NAG and spends 2 ATP. First nitrogen in.',
      objective: 'Carry carbamoyl phosphate to Otis (OTC).',
    },
    {
      key: 'otc',
      title: 'OTC',
      station: { kind: 'character', preset: 'otc', label: 'Otis — OTC', prompt: 'Press E — Otis (OTC)' },
      speaker: 'Otis',
      color: 0x5a7d5a,
      lines: [
        'Steady work: I join carbamoyl phosphate to ornithine to make citrulline.',
        'Note the X on my chest — I am X-linked, the only urea-cycle defect that is. Most common one, too.',
        'When I am broken, carbamoyl phosphate backs up into pyrimidine synthesis: orotic acid rises.',
      ],
      actionLabel: 'Make citrulline',
      product: 'citrulline',
      teach: 'Citrulline. OTC deficiency is X-linked, the most common UCD, with elevated orotic acid.',
      objective: 'Cross the membrane bridge (ORNT1) into the cytosol, then find Donkey (ASS).',
    },
    {
      key: 'ass',
      title: 'Argininosuccinate synthetase',
      station: { kind: 'character', preset: 'ass', label: 'Donkey — ASS', prompt: 'Press E — Donkey (ASS)' },
      speaker: 'Donkey',
      color: 0xa8a0a0,
      lines: [
        'Hee-haw. Stubborn but I get it done. Give me aspartate and an ATP.',
        'Aspartate donates the SECOND nitrogen. My ATP is cleaved all the way to AMP.',
        'Break me and you get citrullinemia type I — citrulline piles up.',
      ],
      actionLabel: 'Add aspartate',
      requires: { aspartate: 1, ATP: 1 },
      needFrom: 'Collect aspartate from the shuttle by the river.',
      needHint: 'ASS needs aspartate (the 2nd nitrogen) and 1 ATP. Grab aspartate from the shuttle.',
      product: 'argininosuccinate',
      teach: 'Argininosuccinate. The second nitrogen came from aspartate; ATP went to AMP.',
      objective: 'Take argininosuccinate to Aslan (ASL).',
    },
    {
      key: 'asl',
      title: 'Argininosuccinate lyase',
      station: { kind: 'character', preset: 'asl', label: 'Aslan — ASL', prompt: 'Press E — Aslan (ASL)' },
      speaker: 'Aslan',
      color: 0xd98324,
      lines: [
        'A Lyase — L for Lion. I cleave argininosuccinate into arginine and FUMARATE.',
        'That fumarate is the bridge to the TCA cycle. Metabolism is one connected place.',
        'My deficiency, argininosuccinic aciduria, gives brittle hair — trichorrhexis nodosa. My mane is the hint.',
      ],
      actionLabel: 'Cleave it',
      itemGives: { fumarate: 1 },
      product: 'arginine',
      teach: 'Arginine + fumarate. ASL feeds fumarate into the TCA cycle. Deficiency: brittle hair.',
      objective: 'Carry arginine to Argus (Arginase 1).',
    },
    {
      key: 'arg1',
      title: 'Arginase 1',
      station: { kind: 'character', preset: 'arg1', label: 'Argus — ARG1', prompt: 'Press E — Argus (Arginase 1)' },
      speaker: 'Argus',
      color: 0x3a6a5a,
      lines: [
        'Many eyes, one job: I split arginine into UREA and ornithine.',
        'The ornithine goes back to the start — that is what makes this a cycle.',
        'Lose me and you get argininemia: high arginine, spastic diplegia.',
      ],
      actionLabel: 'Release urea',
      itemGives: { ornithine: 1 },
      product: 'urea',
      teach: 'Urea + ornithine. Ornithine is regenerated to restart the cycle.',
      objective: 'Dispose of the urea at the waste chute.',
    },
    {
      key: 'dispose',
      title: 'Dispose urea',
      station: { kind: 'machine', machine: 'wasteChute', label: 'Waste Chute', color: 0x8ed64a, prompt: 'Press E — dispose urea' },
      speaker: 'Waste Chute',
      color: 0x8ed64a,
      lines: ['Drop the urea. It leaves the cell for the blood, then the kidney. The ammonia is safely gone.'],
      actionLabel: 'Dispose urea',
      clearsCarried: true,
      teach: 'Urea disposed. The cell is safe — neurotoxic ammonia neutralized as harmless urea.',
      objective: 'Urea cycle complete — run the Reality Check.',
    },
  ],

  quiz: {
    title: 'Urea Cycle — Reality Check',
    questions: [
      {
        q: 'In which compartment does the urea cycle begin?',
        options: ['Cytosol', 'Mitochondrion', 'Endoplasmic reticulum', 'Peroxisome'],
        answer: 1,
        explain: 'CPS1 and OTC are mitochondrial; the remaining steps (ASS, ASL, ARG1) are cytosolic.',
      },
      {
        q: 'What is the obligate allosteric activator of CPS1?',
        options: ['Carbamoyl phosphate', 'N-acetylglutamate (NAG)', 'Arginine', 'Citrulline'],
        answer: 1,
        explain: 'NAG, made by NAGS from acetyl-CoA + glutamate, is required for CPS1 activity. NAGS deficiency is treated with carglumic acid.',
      },
      {
        q: 'The second nitrogen atom of urea is donated by which molecule?',
        options: ['Free ammonia', 'Glutamine', 'Aspartate', 'Glutamate'],
        answer: 2,
        explain: 'The first nitrogen is free ammonia (into CPS1); the second enters as aspartate at ASS (argininosuccinate synthetase).',
      },
      {
        q: 'Which urea-cycle product links the cycle to the TCA cycle?',
        options: ['Ornithine', 'Fumarate', 'Urea', 'Citrulline'],
        answer: 1,
        explain: 'ASL (Aslan) yields arginine + fumarate; fumarate enters the TCA cycle (the aspartate-argininosuccinate shunt).',
      },
      {
        q: 'OTC deficiency: inheritance, and the lab that separates it from CPS1 deficiency?',
        options: [
          'Autosomal recessive; low orotic acid',
          'X-linked; elevated orotic acid',
          'X-linked; low orotic acid',
          'Autosomal dominant; elevated orotic acid',
        ],
        answer: 1,
        explain: 'OTC deficiency is X-linked. Carbamoyl phosphate spills into pyrimidine synthesis, so orotic acid is HIGH (low/normal in CPS1 deficiency).',
      },
    ],
  },

  reward: {
    ability: 'nitrogen-handling',
    title: 'Nitrogen Handling learned',
    message: 'Urea cycle mastered: ammonia neutralized as urea; 3 ATP spent; fumarate feeds the TCA cycle.',
  },
};
