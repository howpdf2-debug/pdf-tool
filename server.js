// server.js - simple PDF merge & health check
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

const upload = multer({ dest: UPLOADS });

// health
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Merge PDFs
app.post('/api/merge', upload.array('pdfs', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files' });

    const merged = await PDFDocument.create();
    for (const f of req.files) {
      const bytes = fs.readFileSync(f.path);
      const donor = await PDFDocument.load(bytes);
      const copied = await merged.copyPages(donor, donor.getPageIndices());
      copied.forEach(p => merged.addPage(p));
      fs.unlinkSync(f.path);
    }
    const outBytes = await merged.save();
    const outPath = path.join(UPLOADS, 'merged-' + Date.now() + '.pdf');
    fs.writeFileSync(outPath, outBytes);
    res.download(outPath, 'merged.pdf', err => { try { fs.unlinkSync(outPath); } catch(e){} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
