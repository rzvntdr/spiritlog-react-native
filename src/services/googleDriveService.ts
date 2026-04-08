import { getAccessToken } from './googleAuthService';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FILENAME = 'spiritlog_backup.json';

/**
 * Upload backup JSON to Google Drive's appDataFolder.
 * Uses appDataFolder so the file is hidden from the user's Drive UI
 * but tied to this app.
 */
export async function uploadBackup(jsonData: string): Promise<{ fileId: string; size: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // Check if a backup file already exists
  const existingId = await findBackupFileId(token);

  if (existingId) {
    // Update existing file
    const response = await fetch(`${DRIVE_UPLOAD_API}/files/${existingId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: jsonData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Drive upload failed: ${err}`);
    }

    const result = await response.json();
    return { fileId: result.id, size: jsonData.length };
  }

  // Create new file with multipart upload
  const metadata = {
    name: BACKUP_FILENAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  const boundary = 'spiritlog_boundary';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    jsonData +
    `\r\n--${boundary}--`;

  const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive upload failed: ${err}`);
  }

  const result = await response.json();
  return { fileId: result.id, size: jsonData.length };
}

/**
 * Download the latest backup from Google Drive's appDataFolder.
 * Returns the JSON string, or null if no backup exists.
 */
export async function downloadBackup(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const fileId = await findBackupFileId(token);
  if (!fileId) return null;

  const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive download failed: ${err}`);
  }

  return response.text();
}

/**
 * Find the backup file ID in appDataFolder.
 */
async function findBackupFileId(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILENAME}'`);
  const response = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Get metadata about the existing backup (if any).
 */
export async function getBackupInfo(): Promise<{ modifiedTime: string; size: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const query = encodeURIComponent(`name='${BACKUP_FILENAME}'`);
  const response = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime,size)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return {
      modifiedTime: data.files[0].modifiedTime,
      size: data.files[0].size,
    };
  }
  return null;
}
