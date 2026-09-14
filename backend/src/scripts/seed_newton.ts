/**
 * Idempotent seed for the Newton Tutorial Private Limited tenant.
 * Safe to re-run: upserts by name/email rather than blindly inserting.
 *
 * Usage:
 *   npx ts-node src/scripts/seed_newton.ts
 *
 * Reads admin credentials from env vars (falls back to the values agreed
 * with the user for this tenant if unset):
 *   NEWTON_ADMIN_EMAIL, NEWTON_ADMIN_PASSWORD, NEWTON_ADMIN_NAME
 */
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Institute } from '../models/Institute';
import { Admin } from '../models/Admin';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set — refusing to run.');
  process.exit(1);
}

const INSTITUTE_NAME = 'Newton Tutorial Private Limited';
const BATCHES = ['Pinnacle-27', 'Pinnacle-28'];

const ADMIN_EMAIL = process.env.NEWTON_ADMIN_EMAIL || 'admin@newton_main.com';
const ADMIN_PASSWORD = process.env.NEWTON_ADMIN_PASSWORD || 'password123';
const ADMIN_NAME = process.env.NEWTON_ADMIN_NAME || 'Newton Tutorial Admin';

async function main() {
  await mongoose.connect(MONGO_URI as string);
  console.log('Connected to MongoDB');

  let institute = await Institute.findOne({ name: INSTITUTE_NAME });
  if (!institute) {
    institute = await Institute.create({
      name: INSTITUTE_NAME,
      batches: BATCHES,
      subscriptionPlan: 'Basic'
    });
    console.log(`Created institute "${INSTITUTE_NAME}" (${institute._id})`);
  } else {
    // Merge batches idempotently rather than overwriting anything already there.
    const merged = Array.from(new Set([...(institute.batches || []), ...BATCHES]));
    if (merged.length !== (institute.batches || []).length) {
      institute.batches = merged;
      await institute.save();
      console.log(`Updated institute "${INSTITUTE_NAME}" batches -> ${merged.join(', ')}`);
    } else {
      console.log(`Institute "${INSTITUTE_NAME}" already exists (${institute._id})`);
    }
  }

  let admin = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    admin = await Admin.create({
      email: ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      name: ADMIN_NAME,
      instituteId: institute._id
    });
    console.log(`Created admin "${ADMIN_EMAIL}" for institute ${institute._id}`);
  } else {
    console.log(`Admin "${ADMIN_EMAIL}" already exists (${admin._id})`);
  }

  console.log('\nSeed complete:');
  console.log(`  Institute: ${institute.name} (${institute._id})`);
  console.log(`  Batches:   ${institute.batches.join(', ')}`);
  console.log(`  Admin:     ${admin.email}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
