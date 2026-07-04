import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import Meeting from '../models/Meeting.js';
import { deleteCache } from '../utils/cache.js';
import { getIO } from '../socket/io.js';

const isTeamMember = (team, userId) => team.members.some((m) => m.user.toString() === userId.toString());

const emitTaskEvent = (event, teamId, task) => {
  const io = getIO();
  if (io) io.to(`team:${teamId}`).emit(event, task);
};

// POST /api/tasks
// if actionItemId's action item already has a taskId, updates that task instead of creating
// a duplicate — covers both "Convert to Task" and "Reassign" from the summary page
export const createTask = async (req, res) => {
  try {
    const { title, description, assignee, team: teamId, meeting: meetingId, dueDate, actionItemId } = req.body;

    let meetingDoc = null;
    let actionItem = null;
    if (meetingId && actionItemId) {
      meetingDoc = await Meeting.findById(meetingId);
      if (!meetingDoc) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      actionItem = meetingDoc.actionItems.id(actionItemId);
      if (!actionItem) {
        return res.status(404).json({ message: 'Action item not found' });
      }
    }

    let task = actionItem?.taskId ? await Task.findById(actionItem.taskId) : null;
    const isReassignment = !!task;

    // fresh task uses the request's team; reassignment sticks to the task's existing team
    const resolvedTeamId = isReassignment ? task.team.toString() : teamId;
    if (!resolvedTeamId) {
      return res.status(400).json({ message: 'A team is required to create a task' });
    }

    const team = await Team.findById(resolvedTeamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamMember(team, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }
    if (!isTeamMember(team, assignee)) {
      return res.status(400).json({ message: 'Assignee must be a member of this team' });
    }

    if (task) {
      task.assignee = assignee;
      task.dueDate = dueDate;
      await task.save();
    } else {
      task = await Task.create({
        title,
        description,
        assignee,
        team: resolvedTeamId,
        meeting: meetingId,
        dueDate,
        createdBy: req.user._id,
      });
    }

    await task.populate('assignee', 'name avatar');
    await task.populate('meeting', 'title');
    await task.populate('createdBy', 'name');

    if (actionItem && !isReassignment) {
      actionItem.taskId = task._id;
      await meetingDoc.save();
    }
    if (meetingId) {
      await deleteCache(`meeting:${meetingId}`);
    }

    emitTaskEvent(isReassignment ? 'task-updated' : 'task-created', resolvedTeamId, task);

    if (assignee && assignee.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: assignee,
        type: 'task_assigned',
        message: isReassignment ? `You've been reassigned: ${task.title}` : `You've been assigned: ${task.title}`,
        meetingId: meetingId || undefined,
      });

      const io = getIO();
      if (io) {
        io.emit('notification', {
          ...notification.toObject(),
          toUserId: notification.recipient.toString(),
        });
      }
    }

    res.status(isReassignment ? 200 : 201).json({ message: isReassignment ? 'Task reassigned' : 'Task created', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/tasks?team=<teamId>  — the team board
// GET /api/tasks?meeting=<meetingId> — tasks created during a specific meeting, shown
// alongside its AI-extracted action items on the summary page
export const getTeamTasks = async (req, res) => {
  try {
    const { team: teamId, meeting: meetingId } = req.query;

    if (meetingId) {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      const attended =
        meeting.host.toString() === req.user._id.toString() ||
        meeting.participants.some((p) => p.user.toString() === req.user._id.toString());
      if (!attended) {
        return res.status(403).json({ message: 'Not authorized to view this meeting\'s tasks' });
      }

      const tasks = await Task.find({ meeting: meetingId })
        .populate('assignee', 'name avatar')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });

      return res.status(200).json({ tasks });
    }

    if (!teamId) {
      return res.status(400).json({ message: 'A team or meeting is required' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (!isTeamMember(team, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    const tasks = await Task.find({ team: teamId })
      .populate('assignee', 'name avatar')
      .populate('createdBy', 'name')
      .populate('meeting', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/tasks/:id/status — any member of the task's team can move it on the board
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const team = await Team.findById(task.team);
    if (!team || !isTeamMember(team, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();
    await task.populate('assignee', 'name avatar');
    await task.populate('meeting', 'title');

    emitTaskEvent('task-updated', task.team.toString(), task);

    res.status(200).json({ task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can delete this task' });
    }

    const teamId = task.team.toString();
    const taskId = task._id.toString();
    await task.deleteOne();

    emitTaskEvent('task-deleted', teamId, { _id: taskId });

    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
