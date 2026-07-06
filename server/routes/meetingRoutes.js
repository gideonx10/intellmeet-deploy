import express from 'express';
import multer from 'multer';
import {
  createMeeting, getMyMeetings, getMeeting,
  getMeetingByCode, startMeeting, endMeeting, deleteMeeting, toggleActionItem,
  uploadRecording, MAX_RECORDING_SIZE_MB, updateAiSettings,
} from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECORDING_SIZE_MB * 1024 * 1024 },
});

// multer errors (file too large etc) would otherwise hit Express's default handler and leak
// internals — respond the same way the rest of the app does instead
const handleUpload = (req, res, next) => {
  uploadVideo.single('recording')(req, res, (err) => {
    if (!err) return next();
    console.error('Recording upload middleware error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `Recording exceeds the ${MAX_RECORDING_SIZE_MB}MB limit` });
    }
    return res.status(400).json({ message: 'Failed to process the uploaded recording' });
  });
};

router.use(protect); // all meeting routes are protected

router.post('/', createMeeting);
router.get('/', getMyMeetings);
router.get('/join/:code', getMeetingByCode);
router.get('/:id', getMeeting);
router.patch('/:id/start', startMeeting);
router.patch('/:id/ai-settings', updateAiSettings);
router.patch('/:id/end', endMeeting);
router.post('/:id/recording', handleUpload, uploadRecording);
router.patch('/:id/actionItems/:itemId', toggleActionItem);
router.delete('/:id', deleteMeeting);

export default router;