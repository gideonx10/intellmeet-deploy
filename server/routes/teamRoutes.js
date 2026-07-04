import express from 'express';
import {
  createTeam, getMyTeams, getTeam, renameTeam, promoteMember, removeMember,
  joinByCode, acceptJoinRequest, rejectJoinRequest,
  inviteByEmail, getMyInvites, acceptInvite, rejectInvite,
} from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createTeam);
router.get('/', getMyTeams);
router.get('/invites/me', getMyInvites);
router.post('/join', joinByCode);

router.get('/:id', getTeam);
router.patch('/:id', renameTeam);
router.patch('/:id/members/:userId/promote', promoteMember);
router.delete('/:id/members/:userId', removeMember);

router.post('/:id/join-requests/:userId/accept', acceptJoinRequest);
router.post('/:id/join-requests/:userId/reject', rejectJoinRequest);

router.post('/:id/invites', inviteByEmail);
router.post('/:id/invites/accept', acceptInvite);
router.post('/:id/invites/reject', rejectInvite);

export default router;
