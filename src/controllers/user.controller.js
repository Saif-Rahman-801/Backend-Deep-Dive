import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);// user you retrived
    const accessToken = user.generateAccessToken(); // this generateAccessToken() method is coming from the user.model.js 
    const refreshToken = user.generateRefreshToken(); // this generateRefreshToken() method is coming from the user.model.js

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access or refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // user register logics
  // get the user details from the front end
  // validate schema model - not empty
  // check if the user already exists with email and userName
  // check user image- avatar
  // upload the images to cloudinary
  // create user object - send it and create entry to DB
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { username, email, fullName, password } = req.body;
  // console.log(req.body);

  if ([fullName, username, email].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with email and userName already exists");
  }

  // multer adds some extra properties to the req object; files is one of them
  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar file is required");
  }

  // add the public id field to delete cloudinary url
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registration successful"));
});

const loginUser = asyncHandler(async (req, res) => {
  //  todo
  /* 
    0. Data from req.body
    1. Check if the email, username available in the req.body
    2. check if the user exists(find the user)
    3. check if the email/username and password matches
    4. access token and refresh token
    5. Send cookie 
     */

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "username or user email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user doesn't exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); // check from the user you got not the User model you created; isPasswordCorrect() is the method you created in the user.model.js

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials;password doesn't match");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logout successful"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message);
  }
});

const changeYourCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // we stored the user in the req obj while user was logging in through jwt middleware
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid user password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Your password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName || email)) {
    throw new ApiError(400, "all fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserCoverImg = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover Image file is missing");
  }

  // Delete the old coverImage here
  /*   const todltUser = await User.findById(req.user?._id);
  const coverImageUrl = todltUser?.coverImage;
  if (!coverImage) {
    throw new ApiError(400, "No cover image to delete");
  }

  try {
    const parts = coverImageUrl.split("/");
    const publicId = parts.pop().split(".")[0];
    deleteFromCloudinary(publicId);
  } catch (error) {
    throw new ApiError(500, "error occured while deleting cover image");
  } */

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password"); // it returns the updated value but it doesn't save the updated value immediately; updated value will be only saved after the whole execution of updateUserCoverImg() function.

  // Delete old cover image after successful update
  if (user.coverImage) {
    // Check if old image URL exists
    // because the updated user isn't saved yet; coverImage refers to the old user cover image
    try {
      const parts = user.coverImage.split("/");
      const publicId = parts.pop().split(".")[0];
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error("Error deleting old cover image:", error);
      throw new ApiError(500, "error occured while deleting cover image");
      // Handle deletion error (log, notify user, etc.) but don't rollback update
    }
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "avatar changed succeefully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // Delete the old avatar Image here

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (user.avatar) {
    // Check if old image URL exists
    // because the updated user isn't saved yet; coverImage refers to the old user cover image
    try {
      const parts = user.avatar.split("/");
      const publicId = parts.pop().split(".")[0];
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error("Error deleting old cover image:", error);
      throw new ApiError(500, "error occured while deleting cover image");
      // Handle deletion error (log, notify user, etc.) but don't rollback update
    }
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "avatar changed succeefully"));
});

/* const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToChannel: { $size: "$subscribedTo" },
      },
    },
  ]);
}); */

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), // getting the user by matching
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id", // from user collections
        foreignField: "channel", // matching field with local field in the subscriptions collection
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubScribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubScribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeYourCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImg,
  getUserChannelProfile,
  getWatchHistory,
};
