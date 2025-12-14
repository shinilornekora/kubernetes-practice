const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const templatePath = path.join(__dirname, 'static', 'index.html');

app.use('/static', express.static(path.join(__dirname, 'static')));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.get('/', async (req, res) => {
  const fullName = process.env.FULL_NAME || 'NO_NAME_PROVIDED';
  const studentGroup = process.env.STUDENT_GROUP || 'NO_GROUP_PROVIDED';
  const university = process.env.UNIVERSITY || 'NO_UNIVERSITY_PROVIDED';

  const tpl = await fs.readFile(templatePath, 'utf8');

  const html = tpl
    .replaceAll('{{FULL_NAME}}', escapeHtml(fullName))
    .replaceAll('{{STUDENT_GROUP}}', escapeHtml(studentGroup))
    .replaceAll('{{UNIVERSITY}}', escapeHtml(university))
    .replaceAll('{{PORT}}', escapeHtml(port));

  res.status(200).type('html').send(html);
});

app.listen(port);