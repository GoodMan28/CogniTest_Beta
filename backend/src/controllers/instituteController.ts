import { Request, Response } from 'express';
import { Institute } from '../models/Institute';

export const getInstitute = async (req: Request, res: Response) => {
  try {
    // For MVP, just get the first institute
    const institute = await Institute.findOne();
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }
    res.status(200).json(institute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInstituteSettings = async (req: Request, res: Response) => {
  try {
    const { name, supportEmail, supportPhone, subscriptionPlan } = req.body;
    let institute = await Institute.findOne();
    
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

export const updateBranding = async (req: Request, res: Response) => {
  try {
    const { themeColor } = req.body;
    let institute = await Institute.findOne();
    
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (themeColor) {
      institute.themeColor = themeColor;
    }

    if (req.file) {
      // Assuming multer saves the file and we store the relative URL
      institute.logoUrl = `/uploads/logos/${req.file.filename}`;
    }

    await institute.save();
    res.status(200).json(institute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
