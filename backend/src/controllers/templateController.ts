import { Response } from 'express';
import { Template } from '../models/Template';
import { AdminRequest } from '../middleware/adminAuth';

export const createTemplate = async (req: AdminRequest, res: Response) => {
  try {
    const { title, course, sections } = req.body;
    
    const newTemplate = new Template({
      instituteId: req.admin!.instituteId, // Always use admin's institute
      title,
      course,
      sections
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTemplates = async (req: AdminRequest, res: Response) => {
  try {
    const templates = await Template.find({ instituteId: req.admin!.instituteId }).sort({ createdAt: -1 });
    res.status(200).json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTemplateById = async (req: AdminRequest, res: Response) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    if (template.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.status(200).json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
