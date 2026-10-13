import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Response } from 'express';
import { existsSync, mkdirSync, createReadStream, promises as fs } from 'fs';
import { join, resolve, basename } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private s3Bucket: string = '';
  private driver: 'local' | 's3' | 'minio' = 'local';
  private localUploadDir: string;

  constructor() {
    this.localUploadDir = StorageService.getUploadDir();
    this.initDriver();
  }

  /**
   * Resolves the persistent upload directory path from environment variables,
   * ensuring that directories are created recursively and isolated from container ephemerality.
   */
  static getUploadDir(): string {
    const configuredPath =
      process.env.STORAGE_LOCAL_PATH ||
      process.env.STORAGE_PATH ||
      process.env.UPLOAD_DIR;
    const targetDir = configuredPath
      ? resolve(process.cwd(), configuredPath)
      : resolve(process.cwd(), 'uploads');

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  private initDriver() {
    const rawDriver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
    const s3Bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || '';
    const s3Endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT || process.env.MINIO_ENDPOINT;

    if (rawDriver === 's3' || rawDriver === 'minio' || s3Bucket) {
      this.driver = rawDriver === 'minio' ? 'minio' : 's3';
      this.s3Bucket = s3Bucket || 'siperu-documents';

      const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
      const accessKeyId =
        process.env.S3_ACCESS_KEY ||
        process.env.AWS_ACCESS_KEY_ID ||
        process.env.MINIO_ROOT_USER ||
        '';
      const secretAccessKey =
        process.env.S3_SECRET_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY ||
        process.env.MINIO_ROOT_PASSWORD ||
        '';

      const forcePathStyle =
        process.env.S3_FORCE_PATH_STYLE === 'true' ||
        rawDriver === 'minio' ||
        Boolean(s3Endpoint);

      this.s3Client = new S3Client({
        region,
        endpoint: s3Endpoint || undefined,
        forcePathStyle,
        credentials:
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined,
      });

      this.logger.log(
        `📦 Storage Driver: ${this.driver.toUpperCase()} (Bucket: ${this.s3Bucket}, Endpoint: ${s3Endpoint || 'AWS Default'})`,
      );
    } else {
      this.driver = 'local';
      this.logger.log(`💾 Storage Driver: PERSISTENT LOCAL VOLUME (${this.localUploadDir})`);
    }
  }

  isObjectStorage(): boolean {
    return this.driver === 's3' || this.driver === 'minio';
  }

  getUploadDir(): string {
    return this.localUploadDir;
  }

  /**
   * Persists an uploaded multer file. If object storage (S3/MinIO) is configured,
   * uploads the file to the remote bucket and cleans up local temporary storage.
   */
  async persistUploadedFile(file: Express.Multer.File): Promise<string> {
    const filename = basename(file.filename);

    if (this.isObjectStorage() && this.s3Client) {
      try {
        const fileStream = createReadStream(file.path);
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: filename,
            Body: fileStream,
            ContentType: file.mimetype,
          }),
        );
        this.logger.log(`Uploaded ${filename} to object storage (${this.s3Bucket})`);

        // Clean up temporary local file once saved to remote object storage
        await fs.unlink(file.path).catch(() => undefined);
      } catch (err: any) {
        this.logger.error(`Failed to upload to object storage: ${err.message}`, err.stack);
        throw err;
      }
    }

    return filename;
  }

  /**
   * Streams a file to Express Response, supporting both S3/MinIO object storage
   * and persistent disk volume storage with path traversal protection.
   */
  async sendOrStreamFile(filename: string, res: Response): Promise<void> {
    const cleanFilename = basename(filename);

    // 1. Try Object Storage if driver is enabled
    if (this.isObjectStorage() && this.s3Client) {
      try {
        const s3Response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.s3Bucket,
            Key: cleanFilename,
          }),
        );

        if (s3Response.ContentType) {
          res.setHeader('Content-Type', s3Response.ContentType);
        }
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(cleanFilename)}"`,
        );

        const body = s3Response.Body as any;
        if (body && typeof body.pipe === 'function') {
          return body.pipe(res);
        }
        if (body && typeof body.transformToByteArray === 'function') {
          const bytes = await body.transformToByteArray();
          res.end(Buffer.from(bytes));
          return;
        }
      } catch (err: any) {
        this.logger.warn(
          `Object storage retrieval failed for ${cleanFilename}, checking persistent volume fallback: ${err.message}`,
        );
      }
    }

    // 2. Persistent volume storage
    const absolutePath = join(this.localUploadDir, cleanFilename);
    const resolvedPath = resolve(absolutePath);

    // Ensure path traversal protection
    if (!resolvedPath.startsWith(this.localUploadDir)) {
      throw new NotFoundException('Lampiran tidak ditemukan.');
    }

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException('Lampiran tidak ditemukan.');
    }

    return res.download(resolvedPath, cleanFilename);
  }

  /**
   * Deletes a file from active persistent storage and local fallback cache.
   */
  async deleteFile(filename: string): Promise<void> {
    const cleanFilename = basename(filename);

    if (this.isObjectStorage() && this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.s3Bucket,
            Key: cleanFilename,
          }),
        );
      } catch (err: any) {
        this.logger.warn(`Failed to delete ${cleanFilename} from S3: ${err.message}`);
      }
    }

    const localPath = join(this.localUploadDir, cleanFilename);
    if (existsSync(localPath)) {
      await fs.unlink(localPath).catch(() => undefined);
    }
  }
}
