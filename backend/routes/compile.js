const express = require('express');
const fs = require('fs');
const path = require('path');
const { session } = require('../db/neo4j');

const router = express.Router();

router.post('/compile', async (req, res) => {
  const { websiteId, homePageId } = req.body;

  try {
    console.log('Compiling website with ID:', websiteId);
    console.log('Home Page ID:', homePageId);

    // Fetch website data
    const result = await session.run(`
      MATCH (w:Website {id: $websiteId})<-[:BELONGS_TO]-(p:Page)<-[:BELONGS_TO]-(widget:Widget)
      RETURN w, p, collect(widget) AS widgets
    `, { websiteId });

    console.log('Database Query Result:', JSON.stringify(result, null, 2));

    if (result.records.length === 0) {
      console.error('No records found for the given website ID');
      return res.status(404).json({ message: 'No data found for the given website ID' });
    }

    const websiteData = result.records.map(record => {
      const page = record.get('p').properties;
      const widgets = record.get('widgets').map(widgetRecord => {
        const widget = widgetRecord.properties;
        console.log('Widget Data (raw):', widget);
        try {
          widget.data = JSON.parse(widget.data);
        } catch (e) {
          console.error('Error parsing widget data:', e);
          widget.data = {};
        }
        try {
          widget.position = JSON.parse(widget.position);
        } catch (e) {
          console.error('Error parsing widget position:', e);
          widget.position = { x: 0, y: 0 };
        }
        try {
          widget.size = JSON.parse(widget.size);
        } catch (e) {
          console.error('Error parsing widget size:', e);
          widget.size = { width: 100, height: 100 };
        }
        console.log('Parsed Widget Data:', widget);
        return widget;
      });
      return { ...page, widgets };
    });

    console.log('Website Data:', JSON.stringify(websiteData, null, 2));

    // Define output directory
    const outputDir = path.join(__dirname, '..', 'compiled-websites', websiteId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate HTML for each page
    websiteData.forEach(page => {
      const pageTitle = page.name || 'Untitled Page';
      const widgetsHtml = page.widgets.map(widget => {
        switch (widget.type) {
          case 'text':
            return `<div class="widget-container" style="left: ${widget.position.x}px; top: ${widget.position.y}px;">
              <p style="font-size: ${widget.data.fontSize}px; color: ${widget.data.fontColor};">${widget.data.text}</p>
            </div>`;
          case 'image':
            return `<div class="widget-container" style="left: ${widget.position.x}px; top: ${widget.position.y}px;">
              <img src="${widget.data.imageUrl}" alt="Image" style="width: ${widget.size.width}px; height: ${widget.size.height}px;" />
            </div>`;
          case 'shape':
            return `<div class="widget-container" style="left: ${widget.position.x}px; top: ${widget.position.y}px; width: ${widget.size.width}px; height: ${widget.size.height}px; background-color: ${widget.data.color};"></div>`;
          default:
            return '';
        }
      }).join('\n');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageTitle}</title>
          <style>
            .widget-container { position: absolute; }
          </style>
        </head>
        <body>
          <div style="width: 100%; height: 100%; position: relative; overflow: hidden;">
            ${widgetsHtml}
          </div>
        </body>
        </html>
      `;

      const filePath = path.join(outputDir, `page_${page.id}.html`);
      console.log(`Writing file ${filePath}`);
      fs.writeFileSync(filePath, htmlContent, 'utf8');
    });

    const homePagePath = path.join(outputDir, `page_${homePageId}.html`);
    if (fs.existsSync(homePagePath)) {
      fs.copyFileSync(homePagePath, path.join(outputDir, 'index.html'));
    }

    res.status(200).json({ message: 'Website compiled successfully', websiteId });
  } catch (error) {
    console.error('Error compiling website:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;