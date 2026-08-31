import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getStudents, getStudentById, updateStudentSettings, uploadProfilePicture } from '../controllers/studentController';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/profiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.put('/:id/settings', updateStudentSettings);
router.put('/:id/profile-picture', upload.single('profilePic'), uploadProfilePicture);

export default router;
