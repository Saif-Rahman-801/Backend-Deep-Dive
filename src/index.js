import connectDB from "./db/index.js";
import "dotenv/config";
import { app } from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log("app listening on port", process.env.PORT);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed (from src/index.js)", error);
  });

/* const app = express()

;( async () => {
  try {
    await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`);
    app.on("Error", (error) => {
        console.log("Database connection error");
        throw error
    })

    app.listen(process.env.PORT, () => {
        console.log(`App listening on port ${process.env.PORT}`);
    })

  } catch (error) {
    console.error("Error", error);
    throw error;
  }
})(); */
