const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// accessing image objects from private bucket -> presign request

const client = new S3Client({
  // aws console > iam user > security credentials tab >
  // access key > create access key > select any option > keys created
  region: "region",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

async function getObject(key) {
  const cmd = new GetObjectCommand({
    Bucket: "bucket-name", // private or public
    Key: key,
  });
  const url = await getSignedUrl(client, cmd);
  return url;
}

async function main() {
  let private_url = await getObject("image_name.png");
}

main();
