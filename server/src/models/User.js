import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: [2, "Full name must contain at least 2 characters."],
      maxlength: [100, "Full name cannot exceed 100 characters."]
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."]
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
      select: false
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient"
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (document, returnedObject) => {
        delete returnedObject.passwordHash;
        return returnedObject;
      }
    }
  }
);

const User = mongoose.model("User", userSchema);

export default User;
