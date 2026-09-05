const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, 'audio');
const outputFile = path.join(__dirname, 'podcasts.json');

if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

const files = fs.readdirSync(audioDir);

// Define allowed extensions for each category
const audioExts = /\.(mp3|wav|m4a|ogg)$/i;
const videoExts = /\.(mp4|webm|mov)$/i;
const imageExts = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

// Filter all supported media files
const mediaFiles = files.filter(file =>
audioExts.test(file) || videoExts.test(file) || imageExts.test(file)
);

const podcasts = mediaFiles.map((file, index) => {
    const baseName = path.parse(file).name;
    const ext = path.parse(file).ext;

    const mdPath = path.join(audioDir, `${baseName}.md`);
    const txtPath = path.join(audioDir, `${baseName}.txt`);

    let description = '';
    let transcript = '';

    if (fs.existsSync(mdPath)) {
        description = fs.readFileSync(mdPath, 'utf8');
    }

    if (fs.existsSync(txtPath)) {
        transcript = fs.readFileSync(txtPath, 'utf8');
    }

    // Determine media type
    let type = 'audio';
    if (videoExts.test(ext)) type = 'video';
    if (imageExts.test(ext)) type = 'image';

    const formattedTitle = baseName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

    return {
        id: String(index + 1),
                                title: formattedTitle,
                                category: 'general',
                                date: new Date().toISOString().split('T')[0],
                                duration: '--:--',
                                author: 'Lecturer',
                                file: `audio/${file}`,
                                type: type,
                                description: description || 'No description provided.',
                                transcript: transcript || 'No transcript provided.'
    };
});

fs.writeFileSync(outputFile, JSON.stringify(podcasts, null, 2));
console.log(`Generated podcasts.json with ${podcasts.length} media item(s).`);
