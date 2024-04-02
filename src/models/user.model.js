import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // url from cloudinary
      required: true,
    },
    coverImage: {
      type: String, // url from cloudinary
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // checking if password is modified or not?

  this.password = await bcrypt.hash(this.password, 10);
  next();
}); // pre is a middleware from mongoose to do some operations before specific operations; use normal function because arrow function doesn't have context of this keyword


/*
In Mongoose, methods is a special property that allows you to add instance methods to your schema. 
When you define a method using userSchema.methods, it becomes available to instances of the model created from that schema. 
isPasswordCorrect is a custom instance method added to the userSchema. 
This method takes a password as an argument and compares it with the hashed password stored in the user instance (this.password). 
It uses bcrypt.compare() to perform the comparison.
When you create a new user object using const user = new User({ user data }) and save it to the database, 
each instance of the User model will have access to the isPasswordCorrect method.
once you retrieve a user from the database using User.findOne() or any other query method, the isPasswordCorrect method will also be available for that user object.
*/
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
}; // creating a manual method to check if the password is correct



userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
}; 
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
