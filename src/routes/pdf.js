const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { buildProjectReportHTML, generatePDF } = require('../services/pdfService');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: defects, error: defectsError } = await supabase
      .from('defects')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (defectsError) {
      return res.status(500).json({ error: 'Failed to fetch defects' });
    }

    const defectsWithPhotos = await Promise.all(
      (defects || []).map(async (defect) => {
        const { data: photos } = await supabase
          .from('defect_photos')
          .select('url')
          .eq('defect_id', defect.id);
        return { ...defect, photos: (photos || []).map(p => p.url) };
      })
    );

    const html = buildProjectReportHTML(project, defectsWithPhotos);
    const pdfBuffer = await generatePDF(html);
    const filename = `PropAgent_${project.name.replace(/\s+/g, '_')}_Report.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

router.get('/defect/:defectId', async (req, res) => {
  try {
    const { defectId } = req.params;
    const supabase = getSupabase();

    const { data: defect, error: defectError } = await supabase
      .from('defects')
      .select('*, projects(name, address, description)')
      .eq('id', defectId)
      .single();

    if (defectError || !defect) {
      return res.status(404).json({ error: 'Defect not found' });
    }

    const { data: photos } = await supabase
      .from('defect_photos')
      .select('url')
      .eq('defect_id', defectId);

    const defectWithPhotos = { ...defect, photos: (photos || []).map(p => p.url) };
    const project = defect.projects || { name: 'Unknown Project' };

    const html = buildProjectReportHTML(project, [defectWithPhotos]);
    const pdfBuffer = await generatePDF(html);
    const filename = `PropAgent_Defect_${defectId}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
