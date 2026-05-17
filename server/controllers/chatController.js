export const createOrSendMessage = async (req, res, next) => {
  try {
    const body = req.body || {};
    // Minimal persistence stub: echo back message payload.
    if (res && typeof res.json === 'function') {
      return res.json({ message: body });
    }
    return { message: body };
  } catch (err) {
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ message: 'Chat controller error' });
    }
    throw err;
  }
};

export default { createOrSendMessage };
