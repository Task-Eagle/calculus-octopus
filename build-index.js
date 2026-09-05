const fs = require('fs');
const path = require('path');

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const outputFile = path.join(__dirname, 'podcasts.json');

const audioExts = /\.(mp3|wav|m4a|ogg)$/i;
const videoExts = /\.(mp4|webm|mov)$/i;
const imageExts = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

async function fetchDriveFiles() {
  let files = [];
  let pageToken = '';
  
  do {
    const query = `'${FOLDER_ID}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000&key=${API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      throw new Error(`Google Drive API Error: ${data.error.message}`);
    }
    
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return files;
}

async function fetchFileContent(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
  const res = await fetch(url);
  return await res.text();
}

async function generateIndex() {
  console.log('Fetching file list from Google Drive...');
  const allFiles = await fetchDriveFiles();

  // Filter media files
  const mediaFiles = allFiles.filter(f => 
    audioExts.test(f.name) || videoExts.test(f.name) || imageExts.test(f.name)
  );

  // Map metadata files by name
  const metadataMap = new Map();
  allFiles.forEach(f => {
    if (f.name.endsWith('.md') || f.name.endsWith('.txt')) {
      metadataMap.set(f.name, f.id);
    }
  });

  const podcasts = [];

  for (let i = 0; i < mediaFiles.length; i++) {
    const file = mediaFiles[i];
    const parsed = path.parse(file.name);
    const baseName = parsed.name;
    const ext = parsed.ext;

    // Direct playback/download URL for Google Drive files
    const mediaUrl = `https://lh3.googleusercontent.com/u/0/d/${file.id}`;
    
    const mdFileId = metadataMap.get(`${baseName}.md`);
    const txtFileId = metadataMap.get(`${baseName}.txt`);

    let description = '';
    let transcript = '';

    if (mdFileId) {
      description = await fetchFileContent(mdFileId);
    }
    if (txtFileId) {
      transcript = await fetchFileContent(txtFileId);
    }

    let type = 'audio';
    if (videoExts.test(ext)) type = 'video';
    if (imageExts.test(ext)) type = 'image';

    const formattedTitle = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

    podcasts.push({
      id: String(i + 1),
      title: formattedTitle,
      category: 'general',
      date: new Date().toISOString().split('T')[0],
      duration: '--:--',
      author: 'Lecturer',
      file: mediaUrl,
      type: type,
      description: description || 'No description provided.',
      transcript: transcript || 'No transcript provided.'
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(podcasts, null, 2));
  console.log(`Generated podcasts.json with ${podcasts.length} Google Drive media item(s).`);
}

generateIndex().catch(err => {
  console.error(err);
  process.exit(1);
});
