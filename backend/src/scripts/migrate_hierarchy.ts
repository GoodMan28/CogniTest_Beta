import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from '../models/Question';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cognitest";

const physicsTaxonomy = {
  "Mechanics": ["Units and Measurements", "Kinematics", "Laws of Motion", "Work, Energy and Power", "System of Particles and Rotational Motion", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids"],
  "Heat and Thermodynamics": ["Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory of Gases"],
  "Oscillations and Waves": ["Oscillations", "Waves"],
  "Electrodynamics": ["Electrostatics", "Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves"],
  "Optics": ["Ray Optics and Optical Instruments", "Wave Optics"],
  "Modern Physics": ["Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics", "Communication Systems"],
  "Experimental Skills in Physics": ["Experimental Physics"]
};

const chemistryTaxonomy = {
  "Physical Chemistry": ["Some Basic Concepts of Chemistry", "Structure of Atom", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry"],
  "Inorganic Chemistry": ["Classification of Elements", "Chemical Bonding", "s-Block Elements", "p-Block Elements", "d- and f-Block Elements", "Coordination Compounds", "General Principles of Isolation of Elements", "Hydrogen", "Environmental Chemistry"],
  "Organic Chemistry": ["General Organic Chemistry", "Hydrocarbons", "Haloalkanes and Haloarenes", "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life", "Practical Organic Chemistry (POC)"]
};

const biologyTaxonomy = {
  "Diversity of Living Organisms": ["The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom"],
  "Structural Organisation in Plants and Animals": ["Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals"],
  "Cell Structure and Function": ["Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division"],
  "Plant Physiology": ["Transport in Plants", "Mineral Nutrition", "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development"],
  "Human Physiology": ["Digestion and Absorption", "Breathing and Exchange of Gases", "Body Fluids and Circulation", "Excretory Products and Their Elimination", "Locomotion and Movement", "Neural Control and Coordination", "Chemical Coordination and Integration"],
  "Reproduction": ["Reproduction in Organisms", "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health"],
  "Genetics and Evolution": ["Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution"],
  "Biology in Human Welfare": ["Human Health and Disease", "Strategies for Enhancement in Food Production", "Microbes in Human Welfare"],
  "Biotechnology": ["Biotechnology: Principles and Processes", "Biotechnology and its Applications"],
  "Ecology": ["Organisms and Populations", "Ecosystem", "Biodiversity and Conservation", "Environmental Issues"]
};

// Flatten to lookup maps (lowercased) for quick mapping
const buildMap = (tax: any) => {
  const map: Record<string, { unit: string, chapter: string }> = {};
  for (const [unit, chapters] of Object.entries(tax)) {
    for (const chapter of (chapters as string[])) {
      map[chapter.toLowerCase()] = { unit, chapter };
      // Adding robust fallback for similar terms
      map[chapter.toLowerCase().replace(/ and /g, ' & ')] = { unit, chapter };
      map[chapter.toLowerCase().split(' ')[0]] = { unit, chapter };
    }
    map[unit.toLowerCase()] = { unit, chapter: "Miscellaneous" }; // fallback if they just provided the unit
  }
  return map;
};

const physMap = buildMap(physicsTaxonomy);
const chemMap = buildMap(chemistryTaxonomy);
const bioMap = buildMap(biologyTaxonomy);

// Some manual overrides for common bad data we saw in the audit
const manualOverrides: Record<string, { unit: string, chapter: string }> = {
  "1-d motion": { unit: "Mechanics", chapter: "Kinematics" },
  "ac": { unit: "Electrodynamics", chapter: "Alternating Current" },
  "gaseous state": { unit: "Physical Chemistry", chapter: "States of Matter" },
  "real gases": { unit: "Physical Chemistry", chapter: "States of Matter" },
  "botany - plant physiology": { unit: "Plant Physiology", chapter: "Miscellaneous" },
  "zoology - human physiology": { unit: "Human Physiology", chapter: "Miscellaneous" },
  "thermochemistry": { unit: "Physical Chemistry", chapter: "Thermodynamics" },
  "kinematics": { unit: "Mechanics", chapter: "Kinematics" }
};

// Check if a string exactly matches a unit or chapter name (case insensitive)
const isUnitOrChapter = (text: string) => {
  const t = text.toLowerCase().trim();
  const allUnitsChapters = new Set([
    ...Object.keys(physicsTaxonomy).map(k => k.toLowerCase()),
    ...Object.values(physicsTaxonomy).flat().map(c => c.toLowerCase()),
    ...Object.keys(chemistryTaxonomy).map(k => k.toLowerCase()),
    ...Object.values(chemistryTaxonomy).flat().map(c => c.toLowerCase()),
    ...Object.keys(biologyTaxonomy).map(k => k.toLowerCase()),
    ...Object.values(biologyTaxonomy).flat().map(c => c.toLowerCase()),
    "mechanics", "work, energy and power", "kinematics", "physical chemistry", "inorganic chemistry", "organic chemistry" // hardcoded just in case
  ]);
  return allUnitsChapters.has(t);
};

const getMapping = (subject: string, text: string) => {
  const t = text.toLowerCase().trim();
  if (manualOverrides[t]) return manualOverrides[t];
  
  if (subject === 'Physics' && physMap[t]) return physMap[t];
  if (subject === 'Chemistry' && chemMap[t]) return chemMap[t];
  if (subject === 'Biology' && bioMap[t]) return bioMap[t];

  // Try finding a partial match
  const mapToUse = subject === 'Physics' ? physMap : subject === 'Chemistry' ? chemMap : bioMap;
  for (const [key, val] of Object.entries(mapToUse)) {
    if (t.includes(key) || key.includes(t)) {
      return val;
    }
  }

  return { unit: "Uncategorized", chapter: "Uncategorized" };
};

const migrateModel = async (Model: any, subjectName: string) => {
  const docs = await Model.find({});
  let migratedCount = 0;

  for (const doc of docs) {
    let unit = 'Uncategorized';
    const chapters = new Set<string>();
    const topics = new Set<string>();

    const oldChapter = typeof doc.chapter === 'string' ? doc.chapter : (doc.chapter?.[0] || "");
    const oldTopics = Array.isArray(doc.topic) ? doc.topic : [];

    // Analyze the old chapter field
    if (oldChapter) {
      const mapping = getMapping(subjectName, oldChapter);
      if (mapping.unit !== 'Uncategorized') {
        unit = mapping.unit;
        if (mapping.chapter !== 'Miscellaneous') chapters.add(mapping.chapter);
        if (!isUnitOrChapter(oldChapter)) topics.add(oldChapter);
      } else {
        if (!isUnitOrChapter(oldChapter)) topics.add(oldChapter);
      }
    }

    // Analyze the old topics
    for (const t of oldTopics) {
      if (typeof t !== 'string') continue;
      const mapping = getMapping(subjectName, t);
      if (mapping.unit !== 'Uncategorized' && mapping.chapter !== 'Miscellaneous') {
        if (unit === 'Uncategorized') unit = mapping.unit; // use first valid unit found
        chapters.add(mapping.chapter);
      }
      if (!isUnitOrChapter(t)) {
        topics.add(t);
      }
    }

    // Fallbacks
    if (chapters.size === 0) chapters.add("Uncategorized");

    // Update using any to bypass strict type checks for old schema during migration
    await Model.updateOne({ _id: doc._id }, {
      $set: {
        unit: unit,
        chapter: Array.from(chapters),
        topic: Array.from(topics)
      }
    });
    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} documents in ${subjectName}`);
};

const runMigration = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for Migration.");

    // Drop indexes to prevent parallel array indexing issues
    try {
      await mongoose.connection.db?.collection('physics_questions').dropIndexes();
      await mongoose.connection.db?.collection('chemistry_questions').dropIndexes();
      await mongoose.connection.db?.collection('biology_questions').dropIndexes();
      console.log("Dropped old indexes.");
    } catch (e) {
      console.log("No indexes to drop or error dropping:", e);
    }

    await migrateModel(PhysicsQuestion, "Physics");
    await migrateModel(ChemistryQuestion, "Chemistry");
    await migrateModel(BiologyQuestion, "Biology");

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
