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
    const { name, subscriptionPlan } = req.body;
    let institute = await Institute.findOne();
    
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    institute.name = name || institute.name;
    institute.subscriptionPlan = subscriptionPlan || institute.subscriptionPlan;
    
    await institute.save();
    res.status(200).json(institute);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
