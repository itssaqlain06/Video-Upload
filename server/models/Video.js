import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
    name: String,
    chunksUploaded: Number,
    totalChunks: Number
});

const Video = mongoose.model('Video', videoSchema);

export default Video;
