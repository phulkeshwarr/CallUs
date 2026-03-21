import { User } from "../models/User.js";
import { getOnlineUserIds } from "../sockets/socketState.js";

export async function listUsers(req, res) {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("name email country userId createdAt");
  const onlineIds = await getOnlineUserIds();

  const payload = users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    country: user.country,
    userId: user.userId,
    createdAt: user.createdAt,
    isOnline: onlineIds.includes(user._id.toString()),
  }));

  return res.json({ users: payload });
}

export async function lookupByUserId(req, res) {
  const { userId } = req.params;
  if (!userId || userId.length !== 6) {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

  const user = await User.findOne({ userId }).select("name country userId");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const onlineIds = await getOnlineUserIds();
  return res.json({
    user: {
      _id: user._id,
      name: user.name,
      country: user.country,
      userId: user.userId,
      isOnline: onlineIds.includes(user._id.toString()),
    },
  });
}