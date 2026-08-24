const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cognitest";

const svgs = {
    14: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
  <!-- AC Source -->
  <circle cx="30" cy="75" r="15" fill="none" stroke="#171717" stroke-width="2"/>
  <path d="M 20 75 Q 25 65 30 75 T 40 75" fill="none" stroke="#171717" stroke-width="2"/>
  <text x="15" y="105" font-family="sans-serif" font-size="12">V_in</text>
  <!-- Transformer Primary -->
  <line x1="45" y1="75" x2="60" y2="75" stroke="#171717" stroke-width="2"/>
  <path d="M 60 75 L 60 45 M 60 45 C 75 45, 75 60, 60 60 C 75 60, 75 75, 60 75 C 75 75, 75 90, 60 90 C 75 90, 75 105, 60 105 L 60 105 L 60 75" fill="none" stroke="#171717" stroke-width="2"/>
  <line x1="60" y1="105" x2="45" y2="105" stroke="#171717" stroke-width="2"/>
  <line x1="45" y1="105" x2="45" y2="75" stroke="#171717" stroke-width="2"/>
  <line x1="80" y1="40" x2="80" y2="110" stroke="#171717" stroke-width="2"/>
  <line x1="85" y1="40" x2="85" y2="110" stroke="#171717" stroke-width="2"/>
  <!-- Transformer Secondary -->
  <path d="M 105 45 C 90 45, 90 60, 105 60 C 90 60, 90 75, 105 75 C 90 75, 90 90, 105 90 C 90 90, 90 105, 105 105" fill="none" stroke="#171717" stroke-width="2"/>
  <!-- Top Branch with D1 -->
  <line x1="105" y1="45" x2="140" y2="45" stroke="#171717" stroke-width="2"/>
  <polygon points="140,35 140,55 155,45" fill="none" stroke="#171717" stroke-width="2"/>
  <line x1="155" y1="35" x2="155" y2="55" stroke="#171717" stroke-width="2"/>
  <text x="142" y="30" font-family="sans-serif" font-size="12">D_1</text>
  <!-- Bottom Branch with D2 -->
  <line x1="105" y1="105" x2="140" y2="105" stroke="#171717" stroke-width="2"/>
  <polygon points="140,95 140,115 155,105" fill="none" stroke="#171717" stroke-width="2"/>
  <line x1="155" y1="95" x2="155" y2="115" stroke="#171717" stroke-width="2"/>
  <text x="142" y="130" font-family="sans-serif" font-size="12">D_2</text>
  <!-- Load Resistor -->
  <line x1="155" y1="45" x2="200" y2="45" stroke="#171717" stroke-width="2"/>
  <line x1="155" y1="105" x2="200" y2="105" stroke="#171717" stroke-width="2"/>
  <line x1="200" y1="45" x2="200" y2="105" stroke="#171717" stroke-width="2"/>
  <!-- Center Tap -->
  <line x1="105" y1="75" x2="250" y2="75" stroke="#171717" stroke-width="2"/>
  <!-- Output -->
  <line x1="200" y1="45" x2="250" y2="45" stroke="#171717" stroke-width="2"/>
  <circle cx="250" cy="45" r="3" fill="#171717"/>
  <circle cx="250" cy="75" r="3" fill="#171717"/>
  <text x="210" y="60" font-family="sans-serif" font-size="12">R_L</text>
  <text x="260" y="45" font-family="sans-serif" font-size="12">A</text>
  <text x="260" y="75" font-family="sans-serif" font-size="12">B</text>
</svg>`,
    89: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
  <line x1="50" y1="120" x2="250" y2="120" stroke="#171717" stroke-width="2" />
  <line x1="50" y1="120" x2="50" y2="30" stroke="#171717" stroke-width="2" />
  <text x="140" y="140" font-family="sans-serif" font-size="14">Reaction Progress</text>
  <text x="10" y="80" font-family="sans-serif" font-size="14" transform="rotate(-90 20,80)">Potential Energy</text>
  <path d="M 70 90 Q 150 20 230 60" fill="none" stroke="#2563eb" stroke-width="3" />
  <line x1="50" y1="90" x2="70" y2="90" stroke="#171717" stroke-width="1" stroke-dasharray="4" />
  <line x1="230" y1="60" x2="250" y2="60" stroke="#171717" stroke-width="1" stroke-dasharray="4" />
  <text x="60" y="80" font-family="sans-serif" font-size="12">R (Reactants)</text>
  <text x="220" y="50" font-family="sans-serif" font-size="12">P (Products)</text>
  <line x1="180" y1="90" x2="180" y2="60" stroke="#ef4444" stroke-width="2" marker-start="url(#arrowhead)" marker-end="url(#arrowhead)" />
  <text x="190" y="75" font-family="sans-serif" font-size="12" fill="#ef4444">&Delta;H</text>
  <defs>
    <marker id="arrowhead" markerWidth="5" markerHeight="4" refX="2.5" refY="2" orient="auto">
      <polygon points="0 0, 5 2, 0 4" fill="#ef4444" />
    </marker>
  </defs>
</svg>`
};

const smiles = {
    50: "COC(=O)c1ccccc1", 
    51: "N#Cc1ccccc1", 
    69: "c1ccccc1", 
    70: "Cc1ccccc1", 
    87: "Oc1ccccc1" 
};

const optionsMediaMap = {
    87: [
        { type: "smiles", content: "Oc1ccccc1" },
        { type: "smiles", content: "C=Cc1ccccc1" },
        { type: "smiles", content: "Nc1ccccc1" },
        { type: "smiles", content: "c1ccccc1" }
    ],
    50: [
        { type: "smiles", content: "O=Cc1ccccc1" },
        null,
        null,
        null
    ]
};


async function run() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const queries = [
        { text: /circuit diagram/, subject: 'physics_questions', updates: { diagramSvg: svgs[14] } },
        { text: /74\.8/, subject: 'chemistry_questions', updates: { diagramSvg: svgs[89] } },
        { text: /methyl benzoate/, subject: 'chemistry_questions', updates: { smilesNotation: smiles[50], optionsMedia: optionsMediaMap[50] } },
        { text: /benzonitrile/, subject: 'chemistry_questions', updates: { smilesNotation: smiles[51] } },
        { text: /phenol/, subject: 'chemistry_questions', updates: { smilesNotation: smiles[87], optionsMedia: optionsMediaMap[87] } },
        { text: /NiCl_4/, subject: 'chemistry_questions', updates: { optionsMedia: [null, null, null, { type: 'smiles', content: 'Cl[Ni-2](Cl)(Cl)Cl' }] } }
    ];

    for (let q of queries) {
        const res = await db.collection(q.subject).updateOne({ questionText: q.text }, { $set: q.updates });
        console.log(`Updated for ${q.text} in ${q.subject}: ${res.modifiedCount}`);
    }

    process.exit(0);
}
run();
