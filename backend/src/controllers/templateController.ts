import { Request, Response } from 'express';
import { Template } from '../models/Template';

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { instituteId, title, course, sections } = req.body;
    
    const newTemplate = new Template({
      instituteId,
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

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.status(200).json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.status(200).json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
