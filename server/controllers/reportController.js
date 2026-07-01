import Room from '../models/Room.js';
import Argument from '../models/Argument.js';
import AIService from '../services/AIService.js';

export const getDebateReport = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.status !== 'ended') {
      return res.status(400).json({ message: 'Debate has not ended yet.' });
    }

    // Try to get AI summary from room, or generate if missing
    let report = room.aiSummary;
    if (!report) {
      report = await AIService.generateFinalDebateReport(roomId);
      room.aiSummary = JSON.stringify(report);
      await room.save();
    } else {
      try { report = JSON.parse(report); } catch (e) {}
    }

    const argumentsList = await Argument.find({ room: roomId }).populate('author', 'username displayName avatar credibilityScore');

    res.json({
      report,
      arguments: argumentsList
    });
  } catch (err) {
    next(err);
  }
};

export const endDebateAndGenerateReport = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    // Only creator or admin can end
    if (String(room.createdBy) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    room.status = 'ended';
    room.endTime = new Date();
    
    // Generate AI Summary synchronously to have it immediately available
    const report = await AIService.generateFinalDebateReport(roomId);
    room.aiSummary = JSON.stringify(report);
    
    await room.save();

    res.json({ message: 'Debate ended', report });
  } catch (err) {
    next(err);
  }
};

export default {
  getDebateReport,
  endDebateAndGenerateReport
};
