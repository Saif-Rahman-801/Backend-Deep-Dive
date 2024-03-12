import { Router } from "express";
import {
  changeYourCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  logOutUser,
  loginUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImg,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  // middleware multer
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeYourCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImg);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
