import { Router, type IRouter } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router: IRouter = Router();

cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"] ?? "",
  api_key: process.env["CLOUDINARY_API_KEY"] ?? "",
  api_secret: process.env["CLOUDINARY_API_SECRET"] ?? "",
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post("/uploads", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "bizzhive", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Upload failed" });
  }
});

export default router;
