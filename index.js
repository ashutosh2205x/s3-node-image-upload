// apis

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");

dotenv.config();

const aws_bucket_name = process.env.AWS_BUCKET_NAME;
const aws_bucket_region = process.env.AWS_BUCKET_REGION;
const aws_access_key = process.env.AWS_ACCESS_KEY;
const aws_secret_key = process.env.AWS_SECRET_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: aws_access_key,
    secretAccessKey: aws_secret_key,
  },
});

const app = express();
const prisma = new PrismaClient();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get("/api/get", async (req, res) => {
  const posts = await prisma.posts.findMany({ orderBy: [{ created: "desc" }] });
  posts.forEach(async (element) => {
    const cmd = new GetObjectCommand({
      Bucket: aws_bucket_name, // private or public
      Key: element.imageName,
    });
    const url = await getSignedUrl(s3, cmd);
    element.imageUrl = url;
  });
  res.send(posts);
});

app.post("/api/post", upload.single("image"), async (req, res) => {
  console.log(req.file);
  //   putting image from client to s3

  let filename = Date.now().toString() + req.file.originalname;
  const cmd = new PutObjectCommand({
    Bucket: aws_bucket_name,
    Key: filename, // to avoid overwriting images
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  });
  await s3.send(cmd);
  const post = await prisma.posts.create({
    data: {
      image: filename,
      captions: req.body.caption,
    },
  });
  res.send(post);
});

app.delete("/api/delete/:id", async (req, res) => {
  const id = req.params.id;
  const post = await prisma.posts.findUnique({ where: { id } });
  if (!post) return res.status(404).send("post not found");

  const cmd = new DeleteObjectCommand({
    Bucket: aws_bucket_name,
    Key: post.imageName,
  });
  await s3.send(cmd); // from s3
  await prisma.posts.delete({ where: { id } }); // from db
  res.send(post);
});

app.listen(8080, () => {
  console.log("server running..");
});
