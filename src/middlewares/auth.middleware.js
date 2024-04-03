import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    /*
    axios.get('/api/route', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
});
in each front-end request there will be a header with the token bearer like avobe
    */
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
/*
    console.log(decodedToken);
    the decoded token looks like this in the console
    decodedToken =  {
    _id: "60f237a3b1935a875d71f", // Example user ID
    email: "example@example.com", // Example email
    username: "example_username", // Example username
    iat: 1649267, // Issued at (timestamp)
    exp: 1649867 // Expiry (timestamp)
  }
*/

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // frontend discuss
      throw new ApiError(401, "Invalid user token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
