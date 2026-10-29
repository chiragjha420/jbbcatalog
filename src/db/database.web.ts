import { getWebDb, idbGet, idbPut } from './indexedDb';

/**
 * Web Database adapter for Expo/Web environment
 * Persists basic key-value settings and provides compatibility interface
 */
class WebDatabaseShim {
  async execAsync(_sql: string): Promise<void> {
    // Schema is handled automatically by IndexedDB onupgradeneeded
    await getWebDb();
  }

  async runAsync(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowId: number }> {
    await getWebDb();
    
    // Handle theme/setting updates
    if (sql.includes('app_settings') && params && params.length >= 2) {
      const key = params[0];
      const value = params[1];
      await idbPut('settings', { key, value });
      return { changes: 1, lastInsertRowId: 1 };
    }

    return { changes: 1, lastInsertRowId: 1 };
  }

  async getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null> {
    await getWebDb();

    if (sql.includes('app_settings') && params && params.length > 0) {
      const key = params[0];
      const record = await idbGet<{ key: string; value: string }>('settings', key);
      return (record ? { value: record.value } : null) as T | null;
    }

    return null;
  }

  async getAllAsync<T>(_sql: string, _params?: any[]): Promise<T[]> {
    await getWebDb();
    return [];
  }
}

const instance = new WebDatabaseShim();

export async function getDatabase(): Promise<any> {
  await getWebDb();
  return instance;
}

export async function initDatabaseSchema(_db?: any): Promise<void> {
  await getWebDb();
}
