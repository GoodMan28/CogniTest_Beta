const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  // Set both password (used by Node) and passwordHash (used by Python demo service)
  const result = await Student.updateMany({}, { $set: { password: hash, passwordHash: hash } });
  console.log(`Updated ${result.modifiedCount} students with new password hash.`);
  await mongoose.disconnect();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
