import { describe, expect, it } from 'vitest';
import { isSupportedDriveFile } from '../../netlify/shared/drive-utils.mjs';

describe('Drive sync file support', () => {
  it('supports manuscript document formats', () => {
    const supportedTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    for (const mimeType of supportedTypes) {
      expect(isSupportedDriveFile({ mimeType })).toBe(true);
    }
  });

  it('leaves binary and image files unsupported', () => {
    const unsupportedTypes = [
      'application/octet-stream',
      'application/pdf',
      'application/vnd.google-apps.presentation',
      'application/vnd.google-apps.spreadsheet',
      'image/png',
      'text/html',
      'text/markdown',
      'text/plain',
      'video/mp4',
    ];

    for (const mimeType of unsupportedTypes) {
      expect(isSupportedDriveFile({ mimeType })).toBe(false);
    }
  });
});
