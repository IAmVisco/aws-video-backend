import {
  CompletedPart,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  S3Client,
  UploadPartCommand,
  UploadPartCommandOutput,
} from '@aws-sdk/client-s3';
import Boom from '@hapi/boom';
import { Video } from '@prisma/client';
import { UploadedFile } from 'express-fileupload';
import getVideoDurationInSeconds from 'get-video-duration';
import crypto from 'node:crypto';
import * as fs from 'node:fs';

import fsp, { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../db';

const CHUNK_SIZE = 1024 * 1024 * 10;
const MAX_RETRIES = 3;

class VideosService {
  private readonly s3Client: S3Client;
  constructor(private bucket = process.env.BUCKET as string) {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION as string });
  }

  async getVideosList(
    authorId: string,
    { limit, offset }: { limit: number; offset: number },
  ): Promise<{ videos: Video[]; count: number }> {
    const where = { authorId };

    const [videos, count] = await prisma.$transaction([
      prisma.video.findMany({
        where,
        skip: offset,
        take: limit,
      }),
      prisma.video.count({ where }),
    ]);

    return { videos, count };
  }

  async getVideo(videoId: string, authorId: string): Promise<Video> {
    const video = await prisma.video.findUnique({
      where: { id: videoId, authorId },
    });

    if (!video) throw Boom.notFound('Video not found');

    return video;
  }

  async deleteVideo(videoId: string, authorId: string): Promise<void> {
    const video = await prisma.video.delete({
      include: { User: true },
      where: { id: videoId, authorId },
    });

    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: `${video.User.name}/${video.fileName}` }),
    );
  }

  async uploadVideo(
    video: UploadedFile,
    userId: string,
    { title, description }: Pick<Video, 'title' | 'description'>,
  ): Promise<void> {
    try {
      const filePath = video.tempFilePath;
      const fileParts = path.parse(video.name);
      const fileName = fileParts.name + '-' + crypto.randomBytes(8).toString('hex') + fileParts.ext;

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      const totalParts = Math.ceil(video.size / CHUNK_SIZE);
      const uploadParams = { Bucket: this.bucket, Key: `${user.name}/${fileName}`, ContentType: video.mimetype };
      let PartNumber = 1;
      const uploadedPartsResults: CompletedPart[] = [];

      let { UploadId } = await this.s3Client.send(new CreateMultipartUploadCommand(uploadParams));

      console.log(
        `Initiated multipart upload, uploadId: ${UploadId}, totalParts: ${totalParts}, fileSize: ${video.size}`,
      );

      await new Promise<void>(async (resolve) => {
        const fileHandle = await fsp.open(filePath, 'r');
        while (true) {
          const { buffer, bytesRead } = await this.readNextPart(fileHandle);

          // EOF
          if (bytesRead === 0) {
            await fileHandle.close();
            return resolve();
          }

          const data = bytesRead < CHUNK_SIZE ? buffer.subarray(0, bytesRead) : buffer;
          const response = await this.uploadPart({ data, key: uploadParams.Key, PartNumber, UploadId: UploadId! });

          console.log(`Uploaded part ${PartNumber} of ${totalParts}`);
          uploadedPartsResults.push({ PartNumber, ETag: response.ETag });
          PartNumber++;
        }
      });

      console.log(`Finished uploading all parts for multipart uploadId: ${UploadId}`);

      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: uploadParams.Key,
          MultipartUpload: { Parts: uploadedPartsResults },
          UploadId: UploadId,
        }),
      );

      console.log(`Successfully completed multipart uploadId: ${UploadId}`);

      const duration = await getVideoDurationInSeconds(video.tempFilePath);

      await prisma.video.create({
        data: { title, description, fileName, duration, authorId: userId },
      });
    } catch (e) {
      console.error(e);
    }
  }

  private async readNextPart(fileDescriptor: FileHandle): Promise<{ buffer: Buffer; bytesRead: number }> {
    return await new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(CHUNK_SIZE);

      fs.read(fileDescriptor.fd, buffer, 0, CHUNK_SIZE, null, (err, bytesRead) => {
        if (err) return reject(err);
        resolve({ bytesRead, buffer });
      });
    });
  }

  private async uploadPart(
    options: { data: Buffer; key: string; PartNumber: number; UploadId: string },
    retry = 1,
  ): Promise<UploadPartCommandOutput> {
    const { data, key, PartNumber, UploadId } = options;
    let response;
    try {
      response = await this.s3Client.send(
        new UploadPartCommand({
          Body: data,
          Bucket: this.bucket,
          Key: key,
          PartNumber,
          UploadId,
        }),
      );
    } catch {
      console.log(`Attempt #${retry}: Failed to upload part ${PartNumber} due to ${JSON.stringify(response)}`);

      if (retry >= MAX_RETRIES) {
        throw response;
      } else return this.uploadPart(options, retry + 1);
    }

    return response;
  }
}

export const videosService = new VideosService();
