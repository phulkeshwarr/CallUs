import { User } from "../models/User.js";
import { getOnlineUserIds } from "../sockets/socketState.js";

export async function listUsers(req, res) {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("name email createdAt");
  const onlineIds = getOnlineUserIds();

  const payload = users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    isOnline: onlineIds.has(user._id.toString()),
  }));

  return res.json({ users: payload });
}