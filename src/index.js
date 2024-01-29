import connectDB from "./db/index.js";
import 'dotenv/config'

connectDB()






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
