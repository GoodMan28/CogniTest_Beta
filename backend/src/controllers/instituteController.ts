import { Response } from 'express';
import { Institute } from '../models/Institute';
import { AdminRequest } from '../middleware/adminAuth';

import { Request } from 'express';

/**
 * Public (unauthenticated) lookup used by the student signup form to
 * populate the batch dropdown — deliberately returns only name + batches,
 * nothing sensitive.
 */
export const getPublicInstituteInfo = async (req: Request, res: Response) => {
  try {
    const instituteId = (req.query.instituteId as string) || process.env.ADMIN_INSTITUTE_ID;
    if (!instituteId) {
      return res.status(400).json({ message: 'instituteId is required' });
    }
    const institute = await Institute.findById(instituteId).select('name batches');
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }
    res.status(200).json({ _id: institute._id, name: institute.name, batches: institute.batches || [] });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getInstitute = async (req: AdminRequest, res: Response) => {
  try {
    const institute = await Institute.findById(req.admin!.instituteId);
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }
    res.status(200).json(institute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInstituteSettings = async (req: AdminRequest, res: Response) => {
  try {
    const { name, supportEmail, supportPhone, subscriptionPlan } = req.body;
    let institute = await Institute.findById(req.admin!.instituteId);
    
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (name !== undefined) institute.name = name;
    if (supportEmail !== undefined) institute.supportEmail = supportEmail;
    if (supportPhone !== undefined) institute.supportPhone = supportPhone;
    if (subscriptionPlan !== undefined) institute.subscriptionPlan = subscriptionPlan;
    
    await institute.save();
    res.status(200).json(institute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBranding = async (req: AdminRequest, res: Response) => {
  try {
    const { themeColor } = req.body;
    let institute = await Institute.findById(req.admin!.instituteId);
    
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (themeColor) {
      institute.themeColor = themeColor;
    }

    if (req.file) {
      // Assuming multer saves the file and we store the relative URL
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      institute.logoUrl = `data:${mimeType};base64,${base64Image}`;
    }

    await institute.save();
    res.status(200).json(institute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
