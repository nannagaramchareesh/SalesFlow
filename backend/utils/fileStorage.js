const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Saves a base64 data URI string to a physical file on disk.
 * @param {string} base64DataURI - The data URI (e.g. data:application/pdf;base64,...)
 * @returns {string} - The relative filename / path stored on disk (e.g. "uploads/abc-123.pdf")
 */
function saveFile(base64DataURI) {
  if (!base64DataURI) return '';
  
  // If it's already a path reference, just return it
  if (!base64DataURI.startsWith('data:')) {
    return base64DataURI;
  }

  const matches = base64DataURI.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 data URI');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Determine extension from MIME type
  let extension = 'bin';
  if (mimeType.includes('pdf')) extension = 'pdf';
  else if (mimeType.includes('sheet') || mimeType.includes('ms-excel') || mimeType.includes('excel')) extension = 'xlsx';
  else if (mimeType.includes('csv')) extension = 'csv';
  else if (mimeType.includes('png')) extension = 'png';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
  else if (mimeType.includes('webp')) extension = 'webp';

  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, uniqueFilename);

  fs.writeFileSync(filePath, buffer);

  return `uploads/${uniqueFilename}`;
}

/**
 * Reads a file from disk and reconstructs a base64 data URI.
 * @param {string} fileRef - The relative filename / path stored in the database (e.g. "uploads/abc-123.pdf")
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} - The base64 data URI
 */
function getFile(fileRef, mimeType) {
  if (!fileRef) return '';

  // If it's already a base64 data URI (for legacy files that were stored directly in DB), return it directly
  if (fileRef.startsWith('data:')) {
    return fileRef;
  }

  const relativePath = fileRef.startsWith('uploads/') ? fileRef.replace('uploads/', '') : fileRef;
  const filePath = path.join(UPLOADS_DIR, relativePath);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return '';
  }

  const buffer = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Deletes a file from disk.
 * @param {string} fileRef - The relative filename / path (e.g. "uploads/abc-123.pdf")
 */
function deleteFile(fileRef) {
  if (!fileRef || fileRef.startsWith('data:')) return;

  const relativePath = fileRef.startsWith('uploads/') ? fileRef.replace('uploads/', '') : fileRef;
  const filePath = path.join(UPLOADS_DIR, relativePath);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete file: ${filePath}`, err);
  }
}

module.exports = {
  saveFile,
  getFile,
  deleteFile
};
