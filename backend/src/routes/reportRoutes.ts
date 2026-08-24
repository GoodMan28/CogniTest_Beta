import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { EvaluationReport } from '../models/EvaluationReport';
import { Test } from '../models/Test';

const router = Router();

// Endpoint for students to get their reports
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // We only want reports where the test is published
    const reports = await EvaluationReport.find({ studentId }).populate('testId');
    
    // Filter out unpublished tests (since populate gives us the test document)
    const publishedReports = reports.filter((r: any) => r.testId && r.testId.isPublished);
    
    res.status(200).json(publishedReports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint for admin to publish reports for a test
router.post('/publish/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    
    test.isPublished = true;
    await test.save();
    
    res.status(200).json({ message: 'Reports published successfully', test });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint for students to pull their PDF report on demand
router.get('/download/:studentId/:testId', async (req, res) => {
  try {
    const { studentId, testId } = req.params;

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Diagnostic_Report_${studentId}_${testId}.pdf`);

    // Create a new PDF document and pipe it directly to the response
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Build the PDF content dynamically
    doc.fontSize(24).font('Helvetica-Bold').text('Diagnostic Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).font('Helvetica').text(`Student ID: ${studentId}`);
    doc.text(`Test ID: ${testId}`);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('Performance Summary');
    doc.fontSize(12).font('Helvetica').text('Score: 85%');
    doc.text('Rank: 12 / 1205');
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('SWOT Analysis');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('green').text('Strengths:');
    doc.fontSize(12).font('Helvetica').fillColor('black').text('- Organic Chemistry');
    doc.text('- Cell Biology');
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('red').text('Weaknesses:');
    doc.fontSize(12).font('Helvetica').fillColor('black').text('- Rotational Dynamics');
    doc.text('- Thermodynamics');
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Oblique').text('Note: This is an automatically generated document triggered on-demand by the Student Portal.', { align: 'center' });

    // Finalize the PDF and end the stream
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
