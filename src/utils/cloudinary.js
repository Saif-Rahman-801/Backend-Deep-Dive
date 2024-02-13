import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file uploaded successfully
    // console.log("File uploaded successfully to the cloudinary", response.url);
    // console.log(response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlink(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;

    // Delete the image using Cloudinary API
    await cloudinary.uploader.destroy(publicId);
    console.log(`Image with public ID ${publicId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting image with public ID ${publicId}:`, error);
    // Handle deletion error appropriately (e.g., log in detail, notify user)
  }
};


export { uploadOnCloudinary, deleteFromCloudinary };
