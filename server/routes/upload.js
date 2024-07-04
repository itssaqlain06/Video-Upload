import express from 'express';
import multer from 'multer';
import fs from 'fs/promises'; // Import fs from promises
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import Video from '../models/Video.js';
import { __dirname } from '../utils.js'; // Import the custom __dirname

const router = express.Router();

// Configure Multer to store file chunks in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ensure the uploads directory exists
const ensureUploadsDirectoryExists = async () => {
    const uploadDir = path.join(__dirname, 'uploads');
    try {
        await fs.access(uploadDir);
    } catch (error) {
        await fs.mkdir(uploadDir);
    }
};

// Handle POST requests to the /upload endpoint
router.post('/', upload.single('chunk'), async (req, res) => {
    const { originalname, buffer } = req.file; // Extract file information
    const { name, chunkIndex, totalChunks } = req.body; // Extract additional data from the request body

    // Ensure the uploads directory exists before writing files
    await ensureUploadsDirectoryExists();

    // Check if the video entry already exists in the database
    let video = await Video.findOne({ name });

    // If the video entry does not exist, create a new entry
    if (!video) {
        video = new Video({
            name,
            chunksUploaded: 0,
            totalChunks: parseInt(totalChunks)
        });
        await video.save();
    }

    // Define the path for the chunk file with desired naming convention
    const chunkPath = path.join(__dirname, 'uploads', `${name}-part${chunkIndex}.mp4`);
    await fs.writeFile(chunkPath, buffer); // Write the chunk to the file system

    // Update the database entry to increment the number of uploaded chunks
    await Video.updateOne({ name }, { $inc: { chunksUploaded: 1 } });

    // Retrieve the updated video entry from the database
    video = await Video.findOne({ name });

    // Check if all chunks have been uploaded
    if (video.chunksUploaded === video.totalChunks) {
        const filePath = path.join(__dirname, 'uploads', `${name}.mp4`);

        // Open a writable stream using fs.promises
        const writeStream = await fs.open(filePath, 'w');

        // Merge all chunks into a single file
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(__dirname, 'uploads', `${name}-part${i}.mp4`);
            const data = await fs.readFile(chunkPath);
            await writeStream.write(data);
            await fs.unlink(chunkPath); // Delete the chunk file after it has been merged
        }

        await writeStream.close(); // Close the write stream

        // Convert the merged file to .mp4 format
        const mp4Path = filePath.replace(path.extname(filePath), '.mp4');
        ffmpeg(filePath)
            .toFormat('mp4')
            .save(mp4Path)
            .on('end', async () => {
                await fs.unlink(filePath); // Delete the original file after conversion
                await Video.deleteOne({ name }); // Remove the video entry from the database
            });
    }

    res.status(200).send('Chunk uploaded successfully');
});

export default router;
