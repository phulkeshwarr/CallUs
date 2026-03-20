import mongoose from "mongoose";
import bcrypt from "bcryptjs";

async function generateUniqueUserId() {
  let attempts = 0;
  while (attempts < 20) {
    const id = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await mongoose.models.User?.findOne({ userId: id });
    if (!exists) return id;
    attempts++;
  }
  // Fallback: timestamp-based
  return String(Date.now()).slice(-6);
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function save(next) {
  if (this.isNew && !this.userId) {
    this.userId = await generateUniqueUserId();
  }
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(input) {
  return bcrypt.compare(input, this.password);
};

export const User = mongoose.model("User", userSchema);